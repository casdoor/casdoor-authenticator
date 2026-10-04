// Copyright 2026 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// expo-sqlite has no web implementation in this Expo SDK, so on the web the
// database is sql.js (SQLite compiled to wasm) kept in memory and saved to
// localStorage after every change.

import {drizzle} from "drizzle-orm/sql-js";
import {Asset} from "expo-asset";
import initSqlJs from "sql.js/dist/sql-wasm-browser.js";

const STORAGE_KEY = "casdoor-authenticator.db";

let database = null;
let saveTimer = null;
const listeners = new Set();

// drizzle keeps this object and only calls its methods per query, so the
// real database can be plugged in after the wasm has loaded
const client = new Proxy({}, {
  get(_, prop) {
    if (!database) {
      throw new Error("The database is not ready yet");
    }
    const value = database[prop];
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export const db = drizzle(client);

// a failure here must not fall back to an empty database, which would then
// be saved over the accounts, so it is left to the migration error screen
function loadSavedDatabase() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return undefined;
  }
  const binary = atob(saved);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function watchChanges() {
  database.updateHook((operation, dbName, tableName) => {
    listeners.forEach((listener) => listener({tableName}));
    scheduleSave();
  });
}

function saveDatabase() {
  saveTimer = null;
  // export() closes and reopens the database, which drops the update hook
  const bytes = database.export();
  watchChanges();
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  localStorage.setItem(STORAGE_KEY, btoa(binary));
}

// every drizzle query on the web runs synchronously, so a timer never fires
// in the middle of a transaction
export function scheduleSave() {
  if (database && !saveTimer) {
    saveTimer = setTimeout(saveDatabase, 200);
  }
}

export function addDatabaseChangeListener(listener) {
  listeners.add(listener);
  return {remove: () => listeners.delete(listener)};
}

export const dbReady = (async() => {
  const wasm = Asset.fromModule(require("sql.js/dist/sql-wasm-browser.wasm"));
  const SQL = await initSqlJs({locateFile: () => wasm.uri});
  database = new SQL.Database(loadSavedDatabase());
  watchChanges();
})();

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

import {useEffect, useState} from "react";
import {migrate} from "drizzle-orm/expo-sqlite/migrator";
import {dbReady, scheduleSave} from "./client";

// the migrator of drizzle-orm/expo-sqlite works with any synchronous SQLite
// driver, it only has to wait for the sql.js database to load first
export const useMigrations = (db, migrations) => {
  const [state, setState] = useState({success: false, error: undefined});

  useEffect(() => {
    dbReady
      .then(() => migrate(db, migrations))
      .then(() => {
        // schema changes don't fire the update hook, so save them explicitly
        scheduleSave();
        setState({success: true, error: undefined});
      })
      .catch((error) => setState({success: false, error}));
  }, []);

  return state;
};

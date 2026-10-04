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

// Same as useLiveQuery() of drizzle-orm/expo-sqlite, but listening to the
// sql.js database of db/client.web.js instead of expo-sqlite.

import {useEffect, useState} from "react";
import {getTableConfig} from "drizzle-orm/sqlite-core";
import {addDatabaseChangeListener} from "./client";

export const useLiveQuery = (query, deps = []) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState();
  const [updatedAt, setUpdatedAt] = useState();

  useEffect(() => {
    const tableName = getTableConfig(query.config.table).name;
    const handleData = (rows) => {
      setData(rows);
      setUpdatedAt(new Date());
    };

    query.then(handleData).catch(setError);
    const listener = addDatabaseChangeListener((change) => {
      if (change.tableName === tableName) {
        query.then(handleData).catch(setError);
      }
    });
    return () => listener.remove();
  }, deps);

  return {data, error, updatedAt};
};

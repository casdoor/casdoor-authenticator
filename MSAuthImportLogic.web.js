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

import i18next from "i18next";

// importing reads the SQLite file of Microsoft Authenticator from an Android
// device, which needs the native file system and expo-sqlite
export const importFromMSAuth = async() => {
  throw new Error(`${i18next.t("msAuthImport.Error importing from Microsoft Authenticator")}: not supported on the web`);
};

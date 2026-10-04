// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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

import AsyncStorage from "@react-native-async-storage/async-storage";

import {db} from "./db/client";
import * as schema from "./db/schema";
import {and, eq, isNull, not, or} from "drizzle-orm";
import {create} from "zustand";
import {generateToken} from "./totpUtil";
import {syncWithCloud} from "./syncLogic";
import {useLiveQuery} from "./db/liveQuery";

export const useAccounts = () => {
  const {data: accounts} = useLiveQuery(
    db.select().from(schema.accounts).where(isNull(schema.accounts.deletedAt))
  );

  return {
    accounts: accounts || [],
  };
};

const useEditAccountStore = create((set, get) => ({
  account: {id: undefined, issuer: undefined, accountName: undefined, secretKey: undefined, oldAccountName: undefined},
  setAccount: (account) => {
    set({account});
  },
  updateAccount: () => {
    const {id, accountName, issuer, secretKey, oldAccountName} = get().account;
    if (!id) {return;}

    const updateData = {};
    if (accountName) {updateData.accountName = accountName;}
    if (issuer) {updateData.issuer = issuer;}
    if (secretKey) {updateData.secretKey = secretKey;}

    if (Object.keys(updateData).length > 0) {
      const currentAccount = db.select().from(schema.accounts)
        .where(eq(schema.accounts.id, Number(id))).limit(1)
        .get();
      if (currentAccount) {
        if (currentAccount.oldAccountName === null && oldAccountName) {
          updateData.oldAccountName = oldAccountName;
        }
        db.update(schema.accounts).set({...updateData, changedAt: new Date()}).where(eq(schema.accounts.id, id)).run();
      }
    }
    set({
      account: {
        id: undefined,
        issuer: undefined,
        accountName: undefined,
        oldAccountName: undefined,
        secretKey: undefined,
      },
    });
  },

  insertAccount: async() => {
    const {accountName, issuer, secretKey} = get().account;
    const origin = await AsyncStorage.getItem("origin");
    if (!accountName || !secretKey) {return;}
    const insertWithDuplicateCheck = (tx, baseAccName) => {
      let attemptCount = 0;
      const maxAttempts = 10;
      const tryInsert = (accName) => {
        const existingAccount = tx.select()
          .from(schema.accounts)
          .where(and(
            eq(schema.accounts.accountName, accName),
            eq(schema.accounts.issuer, issuer || null),
            eq(schema.accounts.secretKey, secretKey)
          ))
          .get();

        if (existingAccount) {
          return accName;
        }

        const conflictingAccount = tx.select()
          .from(schema.accounts)
          .where(and(
            eq(schema.accounts.accountName, accName),
            eq(schema.accounts.issuer, issuer || null)
          ))
          .get();

        if (conflictingAccount) {
          if (attemptCount >= maxAttempts) {
            throw new Error(`Cannot generate a unique name for account ${baseAccName}, tried ${maxAttempts} times`);
          }
          attemptCount++;
          const newAccountName = `${baseAccName}_${Math.random().toString(36).slice(2, 5)}`;
          return tryInsert(newAccountName);
        }

        tx.insert(schema.accounts)
          .values({
            accountName: accName,
            issuer: issuer || null,
            secretKey,
            token: generateToken(secretKey),
            origin: origin || null,
          })
          .run();

        return accName;
      };

      return tryInsert(baseAccName);
    };

    try {
      const finalAccountName = db.transaction((tx) => {
        return insertWithDuplicateCheck(tx, accountName);
      });
      set({account: {id: undefined, issuer: undefined, accountName: undefined, secretKey: undefined}});
      return finalAccountName;
    } catch (error) {
      return null;
    }
  },

  insertAccounts: async(accounts) => {
    try {
      const origin = await AsyncStorage.getItem("origin");
      db.transaction((tx) => {
        const insertWithDuplicateCheck = (baseAccName, issuer, secretKey) => {
          let attemptCount = 0;
          const maxAttempts = 10;
          const tryInsert = (accName) => {
            const existingAccount = tx.select()
              .from(schema.accounts)
              .where(and(
                eq(schema.accounts.accountName, accName),
                eq(schema.accounts.issuer, issuer || null),
                eq(schema.accounts.secretKey, secretKey)
              ))
              .get();

            if (existingAccount) {
              return accName;
            }

            const conflictingAccount = tx.select()
              .from(schema.accounts)
              .where(and(
                eq(schema.accounts.accountName, accName),
                eq(schema.accounts.issuer, issuer || null)
              ))
              .get();

            if (conflictingAccount) {
              if (attemptCount >= maxAttempts) {
                throw new Error(`Cannot generate a unique name for account ${baseAccName}, tried ${maxAttempts} times`);
              }
              attemptCount++;
              const newAccountName = `${baseAccName}_${Math.random().toString(36).slice(2, 7)}`;
              return tryInsert(newAccountName);
            }

            tx.insert(schema.accounts)
              .values({
                accountName: accName,
                issuer: issuer || null,
                secretKey,
                token: generateToken(secretKey),
                origin: origin || null,
              })
              .run();

            return accName;
          };

          return tryInsert(baseAccName);
        };

        for (const account of accounts) {
          const {accountName, issuer, secretKey} = account;
          if (!accountName || !secretKey) {continue;}
          insertWithDuplicateCheck(accountName, issuer, secretKey);
        }
      });
    } catch (error) {
      return null;
    }
  },
  deleteAccount: async(id) => {
    db.update(schema.accounts)
      .set({deletedAt: new Date()})
      .where(eq(schema.accounts.id, id))
      .run();
  },

  deleteAccountByOrigin: async(origin) => {
    db.delete(schema.accounts)
      .where(
        or(
          not(eq(schema.accounts.origin, origin)),
          isNull(schema.accounts.origin)
        )
      )
      .run();
  },
}));

export const useEditAccount = () => useEditAccountStore(state => ({
  account: state.account,
  setAccount: state.setAccount,
  updateAccount: state.updateAccount,
  insertAccount: state.insertAccount,
  insertAccounts: state.insertAccounts,
  deleteAccount: state.deleteAccount,
  deleteAccountByOrigin: state.deleteAccountByOrigin,
}));

const useAccountSyncStore = create((set, get) => ({
  isSyncing: false,
  syncError: null,
  startSync: async(userInfo, serverUrl, token) => {
    if (get().isSyncing) {return;}

    set({isSyncing: true, syncError: null});
    try {
      await syncWithCloud(db, userInfo, serverUrl, token);
    } catch (error) {
      set({syncError: error.message});
    } finally {
      set({isSyncing: false});
    }
    return get().syncError;
  },
  clearSyncError: () => set({syncError: null}),
}));

export const useAccountSync = () => useAccountSyncStore(state => ({
  isSyncing: state.isSyncing,
  syncError: state.syncError,
  startSync: state.startSync,
  clearSyncError: state.clearSyncError,
}));

const useUpdateAccountTokenStore = create(() => ({
  updateToken: async(id) => {
    const account = db.select().from(schema.accounts)
      .where(eq(schema.accounts.id, Number(id))).limit(1).get();
    if (account) {
      db.update(schema.accounts).set({token: generateToken(account.secretKey)}).where(eq(schema.accounts.id, id)).run();
    }
  },
  updateAllTokens: async() => {
    db.transaction(async(tx) => {
      const accounts = tx.select().from(schema.accounts).where(isNull(schema.accounts.deletedAt)).all();
      for (const account of accounts) {
        tx.update(schema.accounts).set({token: generateToken(account.secretKey)}).where(eq(schema.accounts.id, account.id)).run();
      }
    });
  },
}));

export const useUpdateAccountToken = () => useUpdateAccountTokenStore(state => ({
  updateToken: state.updateToken,
  updateAllTokens: state.updateAllTokens,
}));

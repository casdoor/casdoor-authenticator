// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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

import * as React from "react";
import {Dimensions, StyleSheet, View} from "react-native";

import {Appbar, Avatar, Menu, Text, TouchableRipple} from "react-native-paper";
import {useNotifications} from "react-native-notificated";
import {useTranslation} from "react-i18next";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {SvgUri} from "react-native-svg";

import CasdoorLoginPage, {useCasdoorLogout} from "./CasdoorLoginPage";
import LoginMethodSelector from "./LoginMethodSelector";
import useStore from "./useStorage";
import {useAccountSync} from "./useAccountStore";

// sizes scale with phone screens, and are capped for wide browser windows on the web
const {width} = Dimensions.get("window");

const Header = () => {
  const {userInfo, clearAll} = useStore();
  const {isSyncing, syncError, clearSyncError} = useAccountSync();
  const [showLoginPage, setShowLoginPage] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [loginMethod, setLoginMethod] = React.useState(null);
  const {notify} = useNotifications();
  const {t} = useTranslation();
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  const logout = useCasdoorLogout();

  const handleMenuLogoutClicked = () => {
    handleCasdoorLogout();
    closeMenu();
  };

  const {openActionSheet} = LoginMethodSelector({
    onSelectMethod: (method) => {
      setLoginMethod(method);
      setShowLoginPage(true);
    },
  });

  const handleCasdoorLogin = () => {
    openActionSheet();
  };

  const handleHideLoginPage = () => {
    setShowLoginPage(false);
  };

  const handleCasdoorLogout = () => {
    logout();
    clearAll();
    clearSyncError();
  };

  const handleSyncErrorPress = () => {
    notify("error", {
      params: {
        title: t("common.error"),
        description: syncError || t("header.An unknown error occurred during synchronization"),
      },
    });
  };

  return (
    <Appbar.Header mode="small" style={styles.header}>
      <Appbar.Content
        title={
          <View style={styles.titleContainer}>
            <Text style={styles.titleTextCasdoor}>{t("header.Casdoor")}</Text>
          </View>
        }
        style={styles.titleWrapper}
      />
      <View style={styles.rightContainer}>
        {userInfo !== null && (
          <Icon
            name={
              isSyncing
                ? "cloud-sync-outline"
                : syncError
                  ? "cloud-off-outline"
                  : "cloud-check-outline"
            }
            size={22}
            color={isSyncing ? "#FFC107" : syncError ? "#E53935" : "#4CAF50"}
            style={styles.syncIcon}
            onPress={(isSyncing || syncError === null) ? null : handleSyncErrorPress}
          />
        )}
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          contentStyle={styles.menuContent}
          anchorPosition="bottom"
          mode="elevated"
          anchor={
            <TouchableRipple
              onPress={userInfo === null ? handleCasdoorLogin : openMenu}
              style={styles.buttonContainer}
            >
              <View style={styles.buttonContent}>
                {userInfo !== null && (
                  userInfo.avatar?.endsWith(".svg") ? (
                    <View style={[styles.avatar, {width: 28, height: 28}]}>
                      <SvgUri
                        width="28"
                        height="28"
                        uri={userInfo.avatar}
                      />
                    </View>
                  ) : (
                    <Avatar.Image
                      size={28}
                      source={{uri: userInfo.avatar}}
                      style={styles.avatar}
                    />
                  )
                )}
                <Text style={[
                  styles.buttonText,
                  userInfo === null && {marginLeft: 0},
                ]}>
                  {userInfo === null ? t("common.login") : userInfo.name}
                </Text>
              </View>
            </TouchableRipple>
          }
        >
          <Menu.Item onPress={handleMenuLogoutClicked} title={t("common.logout")} />
        </Menu>
      </View>
      {showLoginPage && (
        <CasdoorLoginPage
          onWebviewClose={handleHideLoginPage}
          initialMethod={loginMethod}
        />
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#F2F2F2",
    height: 56,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Math.min(24, width * 0.04),
  },
  titleWrapper: {
    alignItems: "flex-start",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  titleTextCasdoor: {
    fontSize: Math.min(28, Math.max(24, width * 0.05)),
    fontWeight: "bold",
    color: "#212121",
    fontFamily: "Lato_700Bold",
  },
  buttonContainer: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#DDDDDD",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: Math.min(18, Math.max(14, width * 0.042)),
    fontWeight: "600",
    marginLeft: 8,
    color: "#424242",
    fontFamily: "Roboto_500Medium",
  },
  menuContent: {
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    backgroundColor: "transparent",
  },
  syncIcon: {
    marginRight: 12,
  },
});

export default Header;

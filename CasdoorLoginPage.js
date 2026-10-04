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

import React, {useEffect, useState} from "react";
import {WebView} from "react-native-webview";
import {Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity} from "react-native";
import {Portal} from "react-native-paper";
import {useNotifications} from "react-native-notificated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SDK from "casdoor-react-native-sdk";
import PropTypes from "prop-types";
import EnterCasdoorSdkConfig from "./EnterCasdoorSdkConfig";
import ScanQRCodeForLogin from "./ScanLogin";
import useStore from "./useStorage";
import DefaultCasdoorSdkConfig from "./DefaultCasdoorSdkConfig";
import {useTranslation} from "react-i18next";
import {useLanguageSync} from "./useLanguageSync";
import {useEditAccount} from "./useAccountStore";
import * as api from "./api";
import {startWebLogin} from "./webLogin";

let sdk = null;

function CasdoorLoginPage({onWebviewClose, initialMethod}) {
  CasdoorLoginPage.propTypes = {
    onWebviewClose: PropTypes.func.isRequired,
    initialMethod: PropTypes.oneOf(["manual", "scan", "demo"]).isRequired,
  };

  useLanguageSync();
  const {notify} = useNotifications();
  const {t} = useTranslation();
  const [casdoorLoginURL, setCasdoorLoginURL] = useState("");
  const [currentView, setCurrentView] = useState(initialMethod === "scan" ? "scanner" : "config");

  const {
    serverUrl,
    clientId,
    redirectPath,
    appName,
    organizationName,
    token,
    getCasdoorConfig,
    setCasdoorConfig,
    setServerUrl,
    setClientId,
    setAppName,
    setOrganizationName,
    setUserInfo,
    setToken,
  } = useStore();

  useEffect(() => {
    if (initialMethod === "demo") {
      setCasdoorConfig(DefaultCasdoorSdkConfig);
    }
  }, [initialMethod, setCasdoorConfig]);

  const initSdk = () => {
    const configs = {
      demo: DefaultCasdoorSdkConfig,
      scan: getCasdoorConfig(),
      manual: serverUrl && clientId && redirectPath && appName && organizationName ? getCasdoorConfig() : null,
    };
    sdk = configs[initialMethod] ? new SDK(configs[initialMethod]) : null;
  };

  const getCasdoorSignInUrl = async() => {
    initSdk();
    if (sdk) {
      const signinUrl = await sdk.getSigninUrl();
      setCasdoorLoginURL(signinUrl);
    }
  };

  const handleLogin = (method) => {
    // the WebView can't run on the web, so the whole page goes to Casdoor instead
    if (Platform.OS === "web" && method !== "scan") {
      const config = method === "demo" ? DefaultCasdoorSdkConfig : getCasdoorConfig();
      startWebLogin(config).catch((error) => {
        notify("error", {params: {title: t("common.error"), description: error.message}});
      });
      return;
    }

    const actions = {
      manual: () => {
        getCasdoorSignInUrl();
        setCurrentView("webview");
      },
      demo: () => {
        getCasdoorSignInUrl();
        setCurrentView("webview");
      },
      scan: () => setCurrentView("scanner"),
    };

    actions[method]?.();
  };

  const onNavigationStateChange = async(navState) => {
    if (navState.url.startsWith(redirectPath)) {
      onWebviewClose();
      const token = await sdk.getAccessToken(navState.url);
      const userInfo = sdk.JwtDecode(token);
      setToken(token);
      setUserInfo(userInfo);
    }
  };

  const handleQRLogin = async(loginInfo) => {
    setServerUrl(loginInfo.serverUrl);
    setClientId("");
    setAppName("");
    setOrganizationName("");
    initSdk();

    try {
      const accessToken = loginInfo.accessToken;
      const userInfo = sdk.JwtDecode(accessToken);

      await api.validateToken(loginInfo.serverUrl, accessToken);

      setToken(accessToken);
      setUserInfo(userInfo);

      notify("success", {
        params: {
          title: t("common.success"),
          description: t("casdoorLoginPage.Logged in successfully!"),
        },
      });
      setCurrentView("config");
      onWebviewClose();
    } catch (error) {
      notify("error", {
        params: {
          title: t("common.error"),
          description: error.message,
        },
      });
    }
  };

  const renderContent = () => {
    const views = {
      config: (
        <EnterCasdoorSdkConfig
          onClose={() => handleLogin(initialMethod)}
          onWebviewClose={onWebviewClose}
          usePortal={false}
        />
      ),
      scanner: (
        <ScanQRCodeForLogin
          showScanner={true}
          onClose={() => {
            setCurrentView("config");
            onWebviewClose();
          }}
          onLogin={handleQRLogin}
          onError={(message) => {
            notify("error", {params: {title: t("common.error"), description: message}});
          }}
        />
      ),
      webview: casdoorLoginURL && !token && (
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentView("config")}>
            <Text style={styles.backButtonText}>{t("casdoorLoginPage.Back to Config")}</Text>
          </TouchableOpacity>
          <WebView
            source={{uri: casdoorLoginURL}}
            onNavigationStateChange={onNavigationStateChange}
            onError={({nativeEvent}) => {
              notify("error", {
                params: {
                  title: t("common.error"),
                  description: nativeEvent.description,
                },
              });
              setCurrentView("config");
            }}
            style={styles.webview}
            mixedContentMode="always"
            javaScriptEnabled={true}
          />
        </SafeAreaView>
      ),
    };

    return views[currentView] || null;
  };

  return <Portal>{renderContent()}</Portal>;
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
  backButton: {
    padding: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
});

export const useCasdoorLogout = () => {
  const {deleteAccountByOrigin} = useEditAccount();

  const logout = async() => {
    const origin = await AsyncStorage.getItem("origin");

    if (sdk) {
      sdk.clearState();
    }

    deleteAccountByOrigin(origin);
  };

  return logout;
};

export default CasdoorLoginPage;

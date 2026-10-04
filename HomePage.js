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

import React, {useEffect, useRef, useState} from "react";
import {Dimensions, InteractionManager, RefreshControl, TouchableOpacity, View} from "react-native";
import {Divider, IconButton, List, Modal, Portal, Text} from "react-native-paper";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import {CountdownCircleTimer} from "react-native-countdown-circle-timer";
import {useNetInfo} from "@react-native-community/netinfo";
import {FlashList} from "@shopify/flash-list";
import {useNotifications} from "react-native-notificated";
import {useTranslation} from "react-i18next";
import Animated, {
  useAnimatedStyle,
  withTiming
} from "react-native-reanimated";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useNavigation} from "@react-navigation/native";

import SearchBar from "./SearchBar";
import EnterAccountDetails from "./EnterAccountDetails";
import ScanQRCode from "./ScanQRCode";
import EditAccountDetails from "./EditAccountDetails";
import AvatarWithFallback from "./AvatarWithFallback";
import {useImportManager} from "./ImportManager";
import useStore from "./useStorage";
import {useTokenRefresh, validateSecret} from "./totpUtil";
import {useAccountSync, useAccounts, useEditAccount} from "./useAccountStore";
import {completeWebLogin} from "./webLogin";

const {width, height} = Dimensions.get("window");
const REFRESH_INTERVAL = 10000;
const OFFSET_X = width * 0.45;
const OFFSET_Y = height * 0.2;

export default function HomePage() {
  const [isPlusButton, setIsPlusButton] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showEnterAccountModal, setShowEnterAccountModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [placeholder, setPlaceholder] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const {isConnected} = useNetInfo();
  const [canSync, setCanSync] = useState(false);
  const [key, setKey] = useState(0);
  const swipeableRef = useRef(null);
  const {userInfo, serverUrl, token} = useStore();
  const {startSync} = useAccountSync();
  const {accounts} = useAccounts();
  const {setAccount, updateAccount, insertAccount, insertAccounts, deleteAccount} = useEditAccount();
  const {notify} = useNotifications();
  const {t} = useTranslation();
  const {showImportOptions} = useImportManager((data) => {
    handleAddAccount(data);
  }, (err) => {
    notify("error", {
      params: {
        title: t("homepage.Import error"),
        description: err.message,
      },
    });
  }, () => {
    setShowScanner(true);
  });
  const navigation = useNavigation();

  useEffect(() => {
    setCanSync(Boolean(isConnected && userInfo && serverUrl));
  }, [isConnected, userInfo, serverUrl]);

  // on the web, finish the login when Casdoor redirects back to the app
  useEffect(() => {
    const finishWebLogin = async() => {
      // the persisted store loads asynchronously and would overwrite a token set before it
      if (!useStore.persist.hasHydrated()) {
        await new Promise((resolve) => useStore.persist.onFinishHydration(resolve));
      }
      const result = await completeWebLogin();
      if (result) {
        const {setCasdoorConfig, setToken, setUserInfo} = useStore.getState();
        setCasdoorConfig(result.config);
        setToken(result.token);
        setUserInfo(result.userInfo);
        notify("success", {
          params: {title: t("common.success"), description: t("casdoorLoginPage.Logged in successfully!")},
        });
      }
    };
    finishWebLogin().catch((error) => {
      notify("error", {params: {title: t("common.error"), description: error.message}});
    });
  }, []);

  useEffect(() => {
    setFilteredData(accounts);
  }, [accounts]);

  useEffect(() => {
    if (canSync) {
      startSync(userInfo, serverUrl, token);

      const timer = setInterval(() => {
        InteractionManager.runAfterInteractions(() => {
          startSync(userInfo, serverUrl, token);
        });
      }, REFRESH_INTERVAL);

      return () => clearInterval(timer);
    }
  }, [startSync, canSync, token]);

  const onRefresh = async() => {
    setRefreshing(true);
    if (canSync) {
      const syncError = await startSync(userInfo, serverUrl, token);
      if (syncError) {
        notify("error", {
          params: {
            title: "Sync error",
            description: syncError,
          },
        });
      } else {
        notify("success", {
          params: {
            title: "Sync success",
            description: "All your accounts are up to date.",
          },
        });
      }
    }
    setRefreshing(false);
  };

  const handleAddAccount = async(accountDataInput) => {
    if (Array.isArray(accountDataInput)) {
      await insertAccounts(accountDataInput);
    } else {
      await setAccount(accountDataInput);
      await insertAccount();
      closeEnterAccountModal();
    }
  };

  const handleEditAccount = (account) => {
    closeSwipeableMenu();
    setEditingAccount(account);
    setPlaceholder(account.accountName);
    setShowEditAccountModal(true);
  };

  const onAccountEdit = async(newAccountName) => {
    if (editingAccount) {
      setAccount({...editingAccount, accountName: newAccountName, oldAccountName: editingAccount.accountName});
      updateAccount();
      setPlaceholder("");
      setEditingAccount(null);
      closeEditAccountModal();
    }
  };

  const onAccountDelete = async(account) => {
    deleteAccount(account.id);
  };

  const closeEditAccountModal = () => setShowEditAccountModal(false);

  const handleScanPress = () => {
    setShowScanner(true);
    setIsPlusButton(true);
    setShowOptions(false);
  };

  const handleCloseScanner = () => setShowScanner(false);

  const handleScanError = (error) => {
    setShowScanner(false);
    notify("error", {
      params: {
        title: t("homepage.Error scanning QR code"),
        description: error,
      },
    });
  };

  const togglePlusButton = () => {
    setIsPlusButton(!isPlusButton);
    setShowOptions(!showOptions);
  };

  const closeOptions = () => {
    setIsPlusButton(true);
    setShowOptions(false);
    setShowScanner(false);
  };

  const openEnterAccountModal = () => {
    setShowEnterAccountModal(true);
    closeOptions();
  };

  const openImportAccountModal = () => {
    showImportOptions();
    closeOptions();
  };

  const closeEnterAccountModal = () => setShowEnterAccountModal(false);

  const closeSwipeableMenu = () => {
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setFilteredData(query.trim() !== ""
      ? accounts && accounts.filter(item => item.accountName.toLowerCase().includes(query.toLowerCase()))
      : accounts
    );
  };

  const renderRightActions = (progress, dragX, account, onEdit, onDelete) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{translateX: dragX.value + 160}],
      };
    });

    return (
      <Animated.View style={[{width: 160, flexDirection: "row"}, styleAnimation]}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#E6DFF3",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            dragX.value = withTiming(0);
            onEdit(account);
          }}
        >
          <MaterialCommunityIcons name="pencil" size={24} color="#666" />
          <Text style={{marginTop: 4, color: "#666"}}>
            {t("common.edit")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#FF6B6B",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            dragX.value = withTiming(0);
            onDelete(account);
          }}
        >
          <MaterialCommunityIcons name="trash-can" size={24} color="#FFF" />
          <Text style={{marginTop: 4, color: "#FFF"}}>
            {t("common.delete")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleItemPress = (item) => {
    navigation.navigate("ItemDetailPage", {
      item: {
        ...item,
        changedAt: item.changedAt.toISOString(),
      },
    });
  };

  const ListItem = ({item, onPress}) => {
    const {token, timeRemaining} = useTokenRefresh(item.secretKey);

    return (
      <GestureHandlerRootView>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, item, handleEditAccount, onAccountDelete)
          }
          rightThreshold={40}
          overshootRight={false}
          friction={2}
          enableTrackpadTwoFingerGesture
          onSwipeableOpen={() => {
            if (swipeableRef.current) {
              swipeableRef.current.close();
            }
          }}
        >
          <List.Item
            style={{
              height: 80,
              paddingVertical: 6,
              paddingHorizontal: 16,
              justifyContent: "center",
            }}
            title={
              <View style={{justifyContent: "center", paddingLeft: 0, paddingTop: 6}}>
                <Text variant="titleMedium" numberOfLines={1}>
                  {item.accountName}
                </Text>
                <Text variant="titleLarge" style={{fontWeight: "bold"}}>{token}</Text>
              </View>
            }
            left={() => (
              <AvatarWithFallback
                source={{uri: `https://cdn.casbin.org/img/social_${item.issuer?.toLowerCase()}.png`}}
                fallbackSource={{uri: "https://cdn.casbin.org/img/social_default.png"}}
                size={60}
                style={{
                  borderRadius: 10,
                  backgroundColor: "transparent",
                }}
              />
            )}
            right={() => (
              <View style={{justifyContent: "center", alignItems: "center"}}>
                <CountdownCircleTimer
                  key={key}
                  isPlaying={true}
                  duration={30}
                  initialRemainingTime={timeRemaining}
                  colors={["#004777", "#0072A0", "#0099CC", "#FF6600", "#CC3300", "#A30000"]}
                  colorsTime={[30, 24, 18, 12, 6, 0]}
                  size={60}
                  onComplete={() => {
                    setKey(prevKey => prevKey + 1);
                    return {
                      shouldRepeat: true,
                      delay: 0,
                      newInitialRemainingTime: timeRemaining,
                    };
                  }}
                  strokeWidth={5}
                >
                  {({remainingTime}) => (
                    <Text style={{fontSize: 18, fontWeight: "bold"}}>{remainingTime}s</Text>
                  )}
                </CountdownCircleTimer>
              </View>
            )}
            onPress={() => handleItemPress(item)}
          />
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  return (
    <View style={{flex: 1}}>
      <SearchBar onSearch={handleSearch} />
      <FlashList
        data={searchQuery.trim() !== "" ? filteredData : accounts}
        keyExtractor={(item) => `${item.id}`}
        extraData={key}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({item}) => (
          <ListItem item={item} onPress={handleItemPress} />
        )}
        ItemSeparatorComponent={() => <Divider />}
      />

      <Portal>
        <Modal
          visible={showOptions}
          onDismiss={closeOptions}
          contentContainerStyle={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: 300,
            height: 225,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: [{translateX: -150}, {translateY: -112.5}],
          }}
        >
          <TouchableOpacity
            style={{flexDirection: "row", alignItems: "center"}}
            onPress={handleScanPress}
          >
            <IconButton icon={"camera"} size={35} />
            <View style={{width: 180}}>
              <Text style={{fontSize: 18}}>{t("homepage.Scan QR Code")}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{flexDirection: "row", alignItems: "center", marginTop: 10}}
            onPress={openEnterAccountModal}
          >
            <IconButton icon={"keyboard"} size={35} />
            <View style={{width: 180}}>
              <Text style={{fontSize: 18}}>{t("homepage.Enter Secret Code")}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{flexDirection: "row", alignItems: "center", marginTop: 10}}
            onPress={openImportAccountModal}
          >
            <IconButton icon={"import"} size={35} />
            <View style={{width: 180}}>
              <Text style={{fontSize: 18}}>{t("homepage.Import from other app")}</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showEnterAccountModal}
          onDismiss={closeEnterAccountModal}
          contentContainerStyle={{
            backgroundColor: "white",
            padding: 1,
            borderRadius: 10,
            width: "90%",
            height: "40%",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: [{translateX: -OFFSET_X}, {translateY: -OFFSET_Y}],
          }}
        >
          <EnterAccountDetails onClose={closeEnterAccountModal} onAdd={handleAddAccount} validateSecret={validateSecret} />
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showEditAccountModal}
          onDismiss={closeEditAccountModal}
          contentContainerStyle={{
            backgroundColor: "white",
            padding: 1,
            borderRadius: 10,
            width: "90%",
            height: "30%",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: [{translateX: -OFFSET_X}, {translateY: -OFFSET_Y}],
          }}
        >
          <EditAccountDetails onClose={closeEditAccountModal} onEdit={onAccountEdit} placeholder={placeholder} />
        </Modal>
      </Portal>

      {showScanner && (
        <ScanQRCode onClose={handleCloseScanner} showScanner={showScanner} onAdd={handleAddAccount} onError={handleScanError} />
      )}

      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 30,
          right: 30,
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: "#E6DFF3",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={togglePlusButton}
      >
        <IconButton icon={isPlusButton ? "plus" : "close"} size={40} color={"white"} />
      </TouchableOpacity>
    </View>
  );
}

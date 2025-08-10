// Copyright 2025 The Casdoor Authors. All Rights Reserved.
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

import React, {useState} from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {useNavigation} from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {SafeAreaView} from "react-native-safe-area-context";
import {useTranslation} from "react-i18next";
import * as Clipboard from "expo-clipboard";
import {format} from "date-fns";
import {useTokenRefresh} from "./totpUtil";

const ItemDetailPage = ({route}) => {
  const {item} = route.params;
  const navigation = useNavigation();
  const [copied, setCopied] = useState(false);
  const {t} = useTranslation();

  const {token, timeRemaining} = useTokenRefresh(item.secretKey);

const copyToClipboard = async(text) => {
  const textWithoutSpaces = text.replace(/\s/g, '');
  await Clipboard.setStringAsync(textWithoutSpaces);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.tokenSection}>
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenText}>{token}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(token)}
            >
              <Icon name={copied ? "check" : "content-copy"} size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, {width: `${(timeRemaining / 30) * 100}%`}]} />
          </View>
          <Text style={styles.timeText}>{timeRemaining}s</Text>
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <DetailRow label={t("itemDetail.accountName")} value={item.accountName} />
          <DetailRow
            label={t("itemDetail.issuer")}
            value={item.issuer || t("itemDetail.notSpecified")}
          />
          <DetailRow
            label={t("itemDetail.lastModified")}
            value={format(new Date(item.changedAt), "PPpp")}
          />
          <DetailRow
            label={t("itemDetail.secretKey")}
            value={item.secretKey}
            isSecret={true}
          />
          <DetailRow
            label={t("itemDetail.lastSynced")}
            value={item.syncAt ? format(new Date(item.syncAt), "PPpp") : t("itemDetail.neverSynced")}
          />
          <DetailRow label={t("itemDetail.origin")} value={item.origin} />
        </View>
      </View>
    </SafeAreaView>
  );
};

// Helper component for detail rows
const DetailRow = ({label, value, isSecret = false}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (isSecret) {
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailHeaderRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
            <Icon
              name={isVisible ? "eye-off" : "eye"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.detailValue}>
          {isVisible ? value : "••••••••"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 10,
    zIndex: 1,
  },
  tokenSection: {
    marginTop: 60,
    alignItems: "center",
  },
  tokenText: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  detailsContainer: {
    marginTop: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: "column",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: "#000",
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },
  progressContainer: {
    width: "100%",
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
  },
  timeText: {
    marginTop: 5,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default ItemDetailPage;

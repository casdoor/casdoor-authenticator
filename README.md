# Casdoor Authenticator App

[![GitHub Actions](https://github.com/casdoor/casdoor-authenticator/actions/workflows/release.yml/badge.svg)](https://github.com/casdoor/casdoor-authenticator/actions/workflows/release.yml)
[![Release](https://img.shields.io/github/release/casdoor/casdoor-authenticator.svg)](https://github.com/casdoor/casdoor-authenticator/releases/latest)
[![GitHub issues](https://img.shields.io/github/issues/casdoor/casdoor-authenticator?style=flat-square)](https://github.com/casdoor/casdoor-authenticator/issues)
[![GitHub forks](https://img.shields.io/github/forks/casdoor/casdoor-authenticator?style=flat-square)](https://github.com/casdoor/casdoor-authenticator/network)
[![License](https://img.shields.io/github/license/casdoor/casdoor-authenticator?style=flat-square)](https://github.com/casdoor/casdoor-authenticator/blob/master/LICENSE)
[![Discord](https://img.shields.io/discord/1022748306096537660?logo=discord&label=discord&color=5865F2)](https://discord.gg/5rPsrAzK7S)

Casdoor Authenticator App is a mobile application for iOS and Android that provides multi-factor authentication using the TOTP protocol. This app helps secure user accounts by generating time-based one-time passwords (TOTP). The app is developed using the React Native framework.

## Features

- [x] Multi-platform support (iOS/Android/Web)
- [x] TOTP-based multi-factor authentication
- [x] Account synchronization with Casdoor
- [x] Web deployment via GitHub Pages
- [ ] Integration with Casdoor's central service and desktop client

## Quick Start

```bash
git clone https://github.com/casdoor/casdoor-authenticator
cd casdoor-authenticator
npm install && npm run start
```

## Installation

You can use the Casdoor Authenticator App in multiple ways:

- **Web**: Access the web version at https://casdoor.github.io/casdoor-authenticator (automatically deployed from master branch)
- **Android**: Download and install the APK file directly on your device from the GitHub Releases page

### Building from Source

If you prefer to build the app yourself, follow these steps:

### Common Steps

```bash
git clone https://github.com/casdoor/casdoor-authenticator
cd casdoor-authenticator
npm install
```

### Android build

```bash
npm install && npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK file in the `app/build/outputs/apk/release/` directory.

### Web build

```bash
npm install
npm run export:web
```

The web build will be output to the `dist/` directory.

Note: You'll need to have the necessary development environments set up for React Native, Android. Refer to the React Native documentation for detailed setup instructions.

## Usage

- Open the app on your mobile device.
- Scan QR codes to add accounts and generate TOTP codes for login.
- Log in to your accounts for synchronization with Casdoor.

## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](./LICENSE) file for details.

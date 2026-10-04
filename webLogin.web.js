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

// On the web there is no WebView to catch the redirect, so the whole page goes
// to the Casdoor login page and Casdoor redirects back to this page with the
// code. The redirect URI is the address of the app itself, which has to be in
// the Redirect URLs of the Casdoor application.

const PENDING_KEY = "casdoor-web-login";

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

async function getCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

function getRedirectUri() {
  return `${window.location.origin}${window.location.pathname}`;
}

function decodeJwt(token) {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(Array.from(atob(payload), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  return JSON.parse(json);
}

export const startWebLogin = async(config) => {
  const serverUrl = config.serverUrl.trim().replace(/\/+$/, "");
  const state = randomString();
  const codeVerifier = randomString();
  const redirectUri = getRedirectUri();
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({state, codeVerifier, redirectUri, config: {...config, serverUrl}}));

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "read",
    state,
    code_challenge: await getCodeChallenge(codeVerifier),
    code_challenge_method: "S256",
  });
  window.location.assign(`${serverUrl}/login/oauth/authorize?${params}`);
};

// Returns {config, token, userInfo} when the page was opened by the redirect
// back from Casdoor, otherwise null. Throws when the login failed.
export const completeWebLogin = async() => {
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const error = query.get("error");
  const pendingJson = sessionStorage.getItem(PENDING_KEY);
  if ((!code && !error) || !pendingJson) {
    return null;
  }

  const pending = JSON.parse(pendingJson);
  sessionStorage.removeItem(PENDING_KEY);
  // drop code and state from the address bar, so a reload doesn't use them again
  window.history.replaceState(null, "", pending.redirectUri);

  if (error) {
    throw new Error(query.get("error_description") || error);
  }
  if (query.get("state") !== pending.state) {
    throw new Error("Invalid state");
  }

  // no cookies: Casdoor allows the token endpoint from any origin only without credentials
  const response = await fetch(`${pending.config.serverUrl}/api/login/oauth/access_token`, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: pending.config.clientId,
      code,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.codeVerifier,
    }),
  });
  const data = await response.json();
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || `HTTP ${response.status}`);
  }
  return {config: pending.config, token: data.access_token, userInfo: decodeJwt(data.access_token)};
};

import { apiClient } from "./index";

function getBrowserName() {
  if (typeof window === "undefined") {
    return "web";
  }

  const userAgent = window.navigator.userAgent || "";

  if (userAgent.includes("Edg")) {
    return "Edge";
  }

  if (userAgent.includes("Chrome")) {
    return "Chrome";
  }

  if (userAgent.includes("Safari")) {
    return "Safari";
  }

  if (userAgent.includes("Firefox")) {
    return "Firefox";
  }

  return "web";
}

function getPlatformName() {
  if (typeof window === "undefined") {
    return "web";
  }

  return window.navigator.userAgentData?.platform || window.navigator.platform || "web";
}

let transientDeviceId;
export function getBrowserDeviceId() {
  const key = "plate-service.device-id";
  try {const stored = window.localStorage.getItem(key); if (stored) return stored;} catch {}
  transientDeviceId ||= `web-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  try {window.localStorage.setItem(key, transientDeviceId);} catch {}
  return transientDeviceId;
}

export function revokeSession(accessToken, refreshToken) {
  return apiClient.post("/api/auth/logout", {accessToken, refreshToken}, {withAuth: false, timeoutMs: 10000});
}

function buildDeviceMetadata(overrides = {}) {
  return {
    deviceId: getBrowserDeviceId(),
    deviceModel: getBrowserName(),
    os: "web",
    osVersion: getPlatformName(),
    appVersion: "web-1.0.0",
    ...overrides,
  };
}

function unwrapTokenResponse(response) {
  const accessToken = response?.data?.accessToken || "";
  const refreshToken = response?.data?.refreshToken || "";

  if (!accessToken) {
    throw new Error("로그인 응답에 accessToken이 없습니다.");
  }

  if (!refreshToken) {
    throw new Error("로그인 응답에 refreshToken이 없습니다.");
  }

  return {
    accessToken,
    refreshToken,
  };
}

export async function loginWithPassword({ username, password, ...metadata } = {}) {
  const response = await apiClient.post(
    "/api/auth/login",
    {
      username,
      password,
      ...buildDeviceMetadata(metadata),
    },
    {
      withAuth: false,
    }
  );

  return unwrapTokenResponse(response);
}

export async function refreshAccessToken(refreshToken) {
  const response = await apiClient.post(
    "/api/auth/refresh",
    {
      refreshToken,
    },
    {
      withAuth: false,
    }
  );

  return unwrapTokenResponse(response);
}

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  registerAuthFailureHandler,
  setAuthSession,
} from "../api";

const AUTH_STORAGE_KEY = "plate-service.auth";
const AuthContext = createContext(null);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return window.atob(padded);
}

function parseJwtClaims(accessToken) {
  if (!accessToken || typeof window === "undefined") {
    return null;
  }

  try {
    const [, payload] = accessToken.split(".");
    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload));
  } catch (error) {
    return null;
  }
}

function buildUserFromClaims(claims) {
  if (!claims) {
    return null;
  }

  const username =
    claims.username ||
    claims.preferred_username ||
    claims.user_name ||
    claims.sub ||
    claims.email ||
    "";

  const displayName =
    claims.displayName ||
    claims.display_name ||
    claims.nickName ||
    claims.nickname ||
    username;

  const role = Array.isArray(claims.roles)
    ? claims.roles[0] || null
    : claims.role || claims.auth || null;

  if (!username && !displayName && !role) {
    return null;
  }

  return {
    username: username || displayName || "",
    displayName: displayName || username || "",
    role,
  };
}

function isAdminRole(role) {
  if (!role) {
    return false;
  }

  return String(role).toUpperCase() === "993";
}

function normalizeAuthState(authState) {
  if (!authState?.accessToken) {
    return null;
  }

  const userFromToken = buildUserFromClaims(parseJwtClaims(authState.accessToken));

  return {
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken || null,
    user: userFromToken || authState.user || null,
  };
}

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? normalizeAuthState(JSON.parse(raw)) : null;
  } catch (error) {
    return null;
  }
}

function writeStoredAuth(authState) {
  try {
    if (!authState) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  } catch (error) {
    // Ignore storage errors and keep in-memory auth state only.
  }
}

function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());

  useEffect(() => {
    if (authState?.accessToken) {
      setAuthSession(authState.accessToken, authState.refreshToken);
    } else {
      clearAuthSession();
    }

    writeStoredAuth(authState);
  }, [authState]);

  useEffect(() => {
    registerAuthFailureHandler(() => {
      setAuthState(null);

      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    });

    return () => {
      registerAuthFailureHandler(null);
    };
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(authState?.accessToken),
      user: authState?.user || null,
      accessToken: authState?.accessToken || null,
      refreshToken: authState?.refreshToken || null,
      isAdmin: isAdminRole(authState?.user?.role),
      login(nextAuthState) {
        setAuthState(normalizeAuthState(nextAuthState));
      },
      logout() {
        setAuthState(null);
      },
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export { AuthProvider, useAuth };

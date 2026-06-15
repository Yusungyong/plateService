import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  registerAuthFailureHandler,
  setAuthSession,
} from "../api";
import {
  userHasAdminAccess,
  userHasAdminPermission,
} from "../admin/constants/adminPermissions";

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

function normalizeStringArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item));
  }

  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [String(value)];
}

function normalizeAuthorityName(value) {
  return String(value).trim().toUpperCase().replace(/^ROLE_/, "");
}

function collectRoles(claims) {
  return [
    ...normalizeStringArray(claims.roles),
    ...normalizeStringArray(claims.role),
    ...normalizeStringArray(claims.auth),
    ...normalizeStringArray(claims.authorities),
  ];
}

function collectPermissions(claims) {
  return [
    ...normalizeStringArray(claims.permissions),
    ...normalizeStringArray(claims.permission),
    ...normalizeStringArray(claims.scope),
    ...normalizeStringArray(claims.scopes),
  ];
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

  const roles = collectRoles(claims);
  const permissions = collectPermissions(claims);
  const role = roles[0] || null;

  if (!username && !displayName && roles.length === 0 && permissions.length === 0) {
    return null;
  }

  return {
    username: username || displayName || "",
    displayName: displayName || username || "",
    role,
    roles,
    permissions,
  };
}

function hasAnyValue(values, allowedValues) {
  const normalizedValues = normalizeStringArray(values).map(normalizeAuthorityName);
  const normalizedAllowedValues = allowedValues.map(normalizeAuthorityName);
  return normalizedAllowedValues.some((allowedValue) => normalizedValues.includes(allowedValue));
}

function normalizeAuthState(authState) {
  if (!authState?.accessToken) {
    return null;
  }

  const userFromToken = buildUserFromClaims(parseJwtClaims(authState.accessToken));

  return {
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken || null,
    user: userFromToken || normalizeStoredUser(authState.user),
  };
}

function normalizeStoredUser(user) {
  if (!user) {
    return null;
  }

  const roles = normalizeStringArray(user.roles || user.role);
  const permissions = normalizeStringArray(user.permissions);

  return {
    ...user,
    role: user.role || roles[0] || null,
    roles,
    permissions,
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
  const [authState, setAuthState] = useState(() => {
    const storedAuthState = readStoredAuth();

    if (storedAuthState?.accessToken) {
      setAuthSession(storedAuthState.accessToken, storedAuthState.refreshToken);
    }

    return storedAuthState;
  });

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
      isAdmin: userHasAdminAccess(authState?.user),
      hasRole(role) {
        return hasAnyValue(authState?.user?.roles || authState?.user?.role, [role]);
      },
      hasPermission(permission) {
        return hasAnyValue(authState?.user?.permissions, [permission]);
      },
      canAdmin(permission) {
        return userHasAdminPermission(authState?.user, permission);
      },
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

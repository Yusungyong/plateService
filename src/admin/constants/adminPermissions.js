export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
  CONTENT_MANAGER: "CONTENT_MANAGER",
  VIEWER: "VIEWER",
};

export const ADMIN_PERMISSIONS = {
  ADMIN_ACCESS: "ADMIN_ACCESS",
  DASHBOARD_READ: "DASHBOARD_READ",
  STORE_READ: "STORE_READ",
  STORE_APPROVE: "STORE_APPROVE",
  STORE_UPDATE: "STORE_UPDATE",
  FEED_READ: "FEED_READ",
  FEED_MODERATE: "FEED_MODERATE",
  FEED_FEATURE: "FEED_FEATURE",
  SEASONAL_READ: "SEASONAL_READ",
  SEASONAL_MANAGE: "SEASONAL_MANAGE",
  REPORT_READ: "REPORT_READ",
  BANNER_MANAGE: "BANNER_MANAGE",
  NOTICE_MANAGE: "NOTICE_MANAGE",
  SUPPORT_MANAGE: "SUPPORT_MANAGE",
  ADMIN_ACCOUNT_MANAGE: "ADMIN_ACCOUNT_MANAGE",
  SETTING_MANAGE: "SETTING_MANAGE",
};

const ALL_PERMISSIONS = Object.values(ADMIN_PERMISSIONS);

const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ADMIN_ROLES.ADMIN]: ALL_PERMISSIONS,
  [ADMIN_ROLES.OPERATOR]: [
    ADMIN_PERMISSIONS.DASHBOARD_READ,
    ADMIN_PERMISSIONS.STORE_READ,
    ADMIN_PERMISSIONS.STORE_APPROVE,
    ADMIN_PERMISSIONS.STORE_UPDATE,
    ADMIN_PERMISSIONS.FEED_READ,
    ADMIN_PERMISSIONS.FEED_MODERATE,
    ADMIN_PERMISSIONS.FEED_FEATURE,
    ADMIN_PERMISSIONS.SEASONAL_READ,
    ADMIN_PERMISSIONS.SEASONAL_MANAGE,
    ADMIN_PERMISSIONS.REPORT_READ,
  ],
  [ADMIN_ROLES.CONTENT_MANAGER]: [
    ADMIN_PERMISSIONS.DASHBOARD_READ,
    ADMIN_PERMISSIONS.STORE_READ,
    ADMIN_PERMISSIONS.FEED_READ,
    ADMIN_PERMISSIONS.FEED_MODERATE,
    ADMIN_PERMISSIONS.FEED_FEATURE,
    ADMIN_PERMISSIONS.SEASONAL_READ,
    ADMIN_PERMISSIONS.SEASONAL_MANAGE,
    ADMIN_PERMISSIONS.BANNER_MANAGE,
    ADMIN_PERMISSIONS.NOTICE_MANAGE,
  ],
  [ADMIN_ROLES.VIEWER]: [
    ADMIN_PERMISSIONS.DASHBOARD_READ,
    ADMIN_PERMISSIONS.STORE_READ,
    ADMIN_PERMISSIONS.FEED_READ,
    ADMIN_PERMISSIONS.SEASONAL_READ,
    ADMIN_PERMISSIONS.REPORT_READ,
  ],
};

function normalizeAuthority(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

function toAuthorityArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(normalizeAuthority).filter(Boolean);
  }

  return String(value)
    .split(/[,\s]+/)
    .map(normalizeAuthority)
    .filter(Boolean);
}

export function userHasAdminAccess(user) {
  if (!user) {
    return false;
  }

  const roles = toAuthorityArray(user.roles || user.role);
  const permissions = toAuthorityArray(user.permissions);

  return (
    roles.some((role) => Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) ||
    permissions.includes(ADMIN_PERMISSIONS.ADMIN_ACCESS)
  );
}

export function userHasAdminPermission(user, permission) {
  if (!user || !permission) {
    return false;
  }

  const normalizedPermission = normalizeAuthority(permission);
  const roles = toAuthorityArray(user.roles || user.role);
  const permissions = toAuthorityArray(user.permissions);
  const recognizedRoles = roles.filter((role) =>
    Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)
  );

  if (
    roles.includes(ADMIN_ROLES.SUPER_ADMIN) ||
    roles.includes(ADMIN_ROLES.ADMIN)
  ) {
    return true;
  }

  if (permissions.includes(normalizedPermission)) {
    return true;
  }

  if (
    recognizedRoles.length === 0 &&
    permissions.includes(ADMIN_PERMISSIONS.ADMIN_ACCESS)
  ) {
    return true;
  }

  return recognizedRoles.some((role) =>
    (ROLE_PERMISSIONS[role] || []).includes(normalizedPermission)
  );
}

export function getPrimaryAdminRole(user) {
  const roles = toAuthorityArray(user?.roles || user?.role);
  return roles.find((role) => Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) || "";
}

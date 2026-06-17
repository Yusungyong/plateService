export const BUSINESS_ROLES = {
  OWNER: "OWNER",
  STORE_OWNER: "STORE_OWNER",
  RESTAURANT_OWNER: "RESTAURANT_OWNER",
  BUSINESS_OWNER: "BUSINESS_OWNER",
};

export const BUSINESS_PERMISSIONS = {
  OWNER_ACCESS: "OWNER_ACCESS",
  STORE_OWNER_ACCESS: "STORE_OWNER_ACCESS",
  RESTAURANT_MANAGE: "RESTAURANT_MANAGE",
};

const BUSINESS_ROLE_VALUES = Object.values(BUSINESS_ROLES);
const BUSINESS_PERMISSION_VALUES = Object.values(BUSINESS_PERMISSIONS);

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

export function userHasBusinessAccess(user) {
  if (!user) {
    return false;
  }

  const roles = toAuthorityArray(user.roles || user.role);
  const permissions = toAuthorityArray(user.permissions);

  return (
    roles.some((role) => BUSINESS_ROLE_VALUES.includes(role)) ||
    permissions.some((permission) => BUSINESS_PERMISSION_VALUES.includes(permission))
  );
}

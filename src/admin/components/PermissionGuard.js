import { useAuth } from "../../auth/AuthContext";

function PermissionGuard({ permission, children, fallback = null }) {
  const { canAdmin } = useAuth();

  if (!canAdmin(permission)) {
    return fallback;
  }

  return children;
}

export default PermissionGuard;

import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import type { Permission } from "../utils/permissions";

export function usePermission(permission: Permission) {
  const { user } = useAuth();
  return can(user?.role, permission);
}

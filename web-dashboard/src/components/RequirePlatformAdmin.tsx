import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Gates /platform/* — now that tenant users can log in too (see
// AuthContext), the old "login itself rejects non-platform-admins" gate no
// longer protects this console, so it needs its own route-level check.
export function RequirePlatformAdmin() {
  const { user } = useAuth();
  if (!user?.isPlatformAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

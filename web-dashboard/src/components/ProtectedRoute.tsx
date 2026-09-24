import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, signedOutByUser } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    // Remember the page only when the session expired, so re-login continues there.
    const loginPath = location.pathname.startsWith("/platform") ? "/platform/login" : "/login";
    return <Navigate to={loginPath} replace state={signedOutByUser ? { loggedOut: true } : { from: location.pathname }} />;
  }
  return <Outlet />;
}

// Tenant pages need a business; a platform-only admin is sent to the console.
export function RequireTenant() {
  const { user } = useAuth();
  if (user && !user.accountId) return <Navigate to={user.isPlatformAdmin ? "/platform" : "/login"} replace />;
  return <Outlet />;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/services";
import { setUnauthorizedHandler, tokenStorage } from "../api/http";
import type { AuthResponse, CurrentUser } from "../types/models";

interface RegisterInput {
  username: string;
  password: string;
  companyName: string;
  shopName?: string;
  currency?: string;
  email?: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, businessCode?: string) => Promise<CurrentUser>;
  adminLogin: (username: string, password: string) => Promise<CurrentUser>;
  register: (input: RegisterInput) => Promise<CurrentUser>;
  // Replaces the stored session (e.g. after changing your own password,
  // which revokes the old token and returns a new one).
  applySession: (res: AuthResponse) => CurrentUser;
  // Explicit sign-out (menu) vs. an expired session: after an explicit
  // sign-out the next login starts at the dashboard, not the last page.
  logout: (options?: { explicit?: boolean }) => void;
  signedOutByUser: boolean;
}

const USER_KEY = "rental_admin_user";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: CurrentUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

function toCurrentUser(res: AuthResponse): CurrentUser {
  return {
    username: res.username,
    role: res.role,
    accountId: res.account_id ?? null,
    isPlatformAdmin: Boolean(res.is_platform_admin),
    businessCode: res.business_code ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => (tokenStorage.get() ? readStoredUser() : null));
  const [signedOutByUser, setSignedOutByUser] = useState(false);

  const logout = useCallback((options?: { explicit?: boolean }) => {
    tokenStorage.clear();
    writeStoredUser(null);
    setSignedOutByUser(Boolean(options?.explicit));
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  // Refresh role/business details from the server once per load, so a role
  // change made by an admin shows up without logging out and back in.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authApi
      .me()
      .then((me) =>
        setUser((current) => {
          if (!current) return current;
          const next: CurrentUser = {
            ...current,
            username: me.username,
            role: me.role,
            accountId: me.account_id,
            isPlatformAdmin: me.is_platform_admin,
            businessCode: me.business_code,
          };
          writeStoredUser(next);
          return next;
        })
      )
      .catch(() => {
        /* 401 is handled by the interceptor; other errors keep the cached session */
      });
  }, []);

  const applySession = useCallback((res: AuthResponse) => {
    tokenStorage.set(res.access_token);
    const next = toCurrentUser(res);
    writeStoredUser(next);
    setSignedOutByUser(false);
    setUser(next);
    return next;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (username, password, businessCode) => applySession(await authApi.login(username, password, businessCode)),
      adminLogin: async (username, password) => applySession(await authApi.adminLogin(username, password)),
      register: async (input) =>
        applySession(
          await authApi.register({
            username: input.username,
            password: input.password,
            company_name: input.companyName,
            shop_name: input.shopName,
            currency: input.currency,
            email: input.email || undefined,
          })
        ),
      applySession,
      logout,
      signedOutByUser,
    }),
    [user, applySession, logout, signedOutByUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

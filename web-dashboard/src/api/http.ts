import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "../types/models";

// `npm run dev` talks to the local Node API, `npm run build` to the hosted one;
// VITE_API_URL overrides both.
export const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/" : "https://marzi-api.vercel.app/");

const TOKEN_KEY = "rental_admin_token";

// localStorage can throw (private mode, blocked storage); a failed read just
// means "signed out".
export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: session lasts for this tab only */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const http = axios.create({ baseURL: API_URL, timeout: 30_000 });

// The active shop lives in ShopContext; it is mirrored here synchronously so
// every request (including ones fired during the first render) carries the
// right X-Shop-Id.
let activeShopId: string | null = null;
export function setActiveShopIdForRequests(shopId: string | null) {
  activeShopId = shopId;
}
export function getActiveShopIdForRequests() {
  return activeShopId;
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (activeShopId) config.headers["X-Shop-Id"] = activeShopId;
  return config;
});

// Every backend error body is `{ detail, code?, ... }` — normalize axios errors
// down to that shape so callers can show `error.detail` without unwrapping axios.
export function apiErrorMessage(err: unknown): ApiErrorBody {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  if (axiosErr?.response?.data?.detail) return axiosErr.response.data;
  if (axiosErr?.code === "ECONNABORTED") return { detail: "The server took too long to respond. Please try again.", code: "TIMEOUT" };
  if (axiosErr?.request && !axiosErr.response) return { detail: "Can't reach the server. Check your connection and try again.", code: "NETWORK" };
  return { detail: axiosErr?.message || "Something went wrong. Please try again." };
}

type Handler = (error: ApiErrorBody) => void;
const handlers: { unauthorized: Handler | null; shopNotAccessible: Handler | null; subscription: Handler | null } = {
  unauthorized: null,
  shopNotAccessible: null,
  subscription: null,
};

export function setUnauthorizedHandler(handler: Handler) {
  handlers.unauthorized = handler;
}
export function setShopNotAccessibleHandler(handler: Handler) {
  handlers.shopNotAccessible = handler;
}
export function setSubscriptionHandler(handler: Handler) {
  handlers.subscription = handler;
}

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiErrorBody>) => {
    const status = err.response?.status;
    const body = err.response?.data;
    const isLogin = typeof err.config?.url === "string" && /\/auth\/(admin\/)?login$/.test(err.config.url);
    if (status === 401 && !isLogin) handlers.unauthorized?.(body ?? { detail: "Signed out" });
    if (status === 403 && (body?.code === "SHOP_NOT_ACCESSIBLE" || body?.code === "NO_ACTIVE_SHOP")) handlers.shopNotAccessible?.(body);
    if (status === 402 && body) handlers.subscription?.(body);
    return Promise.reject(err);
  }
);

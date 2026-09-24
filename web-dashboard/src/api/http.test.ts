import { describe, expect, it, vi } from "vitest";
import { http as mswHttp, HttpResponse } from "msw";
import { server, API } from "../test/server";
import { http, setActiveShopIdForRequests, setShopNotAccessibleHandler, setUnauthorizedHandler, tokenStorage, apiErrorMessage } from "./http";

describe("HTTP client", () => {
  it("sends the bearer token and the active shop on every request", async () => {
    let seen: { auth: string | null; shop: string | null } = { auth: null, shop: null };
    server.use(
      mswHttp.get(`${API}/ping`, ({ request }) => {
        seen = { auth: request.headers.get("authorization"), shop: request.headers.get("x-shop-id") };
        return HttpResponse.json({});
      })
    );
    tokenStorage.set("abc");
    setActiveShopIdForRequests("shop-2");
    await http.get("/ping");
    expect(seen).toEqual({ auth: "Bearer abc", shop: "shop-2" });
  });

  it("signs out on 401 but not for a failed login attempt", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    server.use(
      mswHttp.get(`${API}/secret`, () => HttpResponse.json({ detail: "expired" }, { status: 401 })),
      mswHttp.post(`${API}/auth/login`, () => HttpResponse.json({ detail: "Incorrect username or password." }, { status: 401 }))
    );
    await expect(http.post("/auth/login", {})).rejects.toBeTruthy();
    expect(onUnauthorized).not.toHaveBeenCalled();
    await expect(http.get("/secret")).rejects.toBeTruthy();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("resets the shop when the server says it isn't accessible", async () => {
    const onShop = vi.fn();
    setShopNotAccessibleHandler(onShop);
    server.use(mswHttp.get(`${API}/customers`, () => HttpResponse.json({ detail: "no", code: "SHOP_NOT_ACCESSIBLE" }, { status: 403 })));
    await expect(http.get("/customers")).rejects.toBeTruthy();
    expect(onShop).toHaveBeenCalledOnce();
  });

  it("turns errors into { detail, code }", async () => {
    server.use(mswHttp.get(`${API}/boom`, () => HttpResponse.json({ detail: "Nope", code: "X" }, { status: 400 })));
    const err = await http.get("/boom").catch((e) => e);
    expect(apiErrorMessage(err)).toMatchObject({ detail: "Nope", code: "X" });
    server.use(mswHttp.get(`${API}/down`, () => HttpResponse.error()));
    const network = await http.get("/down").catch((e) => e);
    expect(apiErrorMessage(network).code).toBe("NETWORK");
  });
});

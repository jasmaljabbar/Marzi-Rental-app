import { describe, expect, it } from "vitest";
import { createQueryClient } from "./queryClient";
import { setActiveShopIdForRequests } from "../api/http";

describe("query cache is separated per shop", () => {
  it("stores the same query key under different entries for different shops", () => {
    const client = createQueryClient();
    setActiveShopIdForRequests("shop-a");
    client.setQueryData(["customers"], ["from A"]);
    setActiveShopIdForRequests("shop-b");
    expect(client.getQueryData(["customers"])).toBeUndefined();
    client.setQueryData(["customers"], ["from B"]);
    setActiveShopIdForRequests("shop-a");
    expect(client.getQueryData(["customers"])).toEqual(["from A"]);
  });
});

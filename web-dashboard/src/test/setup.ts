import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./server";
import { setActiveShopIdForRequests, tokenStorage } from "../api/http";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  tokenStorage.clear();
  setActiveShopIdForRequests(null);
});
afterAll(() => server.close());

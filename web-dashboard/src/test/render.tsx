import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ShopProvider } from "../context/ShopContext";
import { createQueryClient } from "../lib/queryClient";
import { tokenStorage } from "../api/http";
import type { CurrentUser } from "../types/models";

// Signs in as a returning user whose shop is already selected.
export function signIn(user: Partial<CurrentUser> = {}) {
  tokenStorage.set("test-token");
  localStorage.setItem("rental_admin_shop_id", "s1");
  localStorage.setItem(
    "rental_admin_user",
    JSON.stringify({ username: "owner", role: "owner", accountId: "a1", isPlatformAdmin: false, businessCode: "acme", ...user })
  );
}

export function renderWithProviders(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ShopProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </ShopProvider>
        </AuthProvider>
      </QueryClientProvider>
    ),
  };
}

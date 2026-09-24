import { QueryClient, hashKey } from "@tanstack/react-query";
import { getActiveShopIdForRequests } from "../api/http";

// Every cached query is keyed by the active shop as well as its own key, so
// data read for one shop is never shown for another after switching.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          return status !== undefined && status >= 400 && status < 500 ? false : failureCount < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 15_000,
        queryKeyHashFn: (queryKey) => hashKey([getActiveShopIdForRequests(), ...queryKey]),
      },
    },
  });
}

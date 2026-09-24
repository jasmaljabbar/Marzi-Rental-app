import type { AxiosResponse } from "axios";
import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { PaginatedResult } from "../types/models";

export interface PageParams {
  page: number;
  page_size: number;
}

// The backend only activates pagination (and only then emits the
// X-Total-Count/X-Page/X-Page-Size/X-Total-Pages headers) when BOTH `page`
// and `page_size` query params are sent — the response body is always a
// bare array either way. This reads those headers into a normal object so
// callers don't have to know about the header-based contract.
export function toPaginatedResult<T>(res: AxiosResponse<T[]>, fallbackParams: PageParams): PaginatedResult<T> {
  const items = res.data;
  const total = Number(res.headers["x-total-count"] ?? items.length);
  const page = Number(res.headers["x-page"] ?? fallbackParams.page);
  const pageSize = Number(res.headers["x-page-size"] ?? fallbackParams.page_size);
  const totalPages = Number(res.headers["x-total-pages"] ?? Math.max(1, Math.ceil(total / pageSize)));
  return { items, total, page, pageSize, totalPages };
}

export function usePaginatedQuery<T>(
  queryKey: unknown[],
  fetcher: () => Promise<PaginatedResult<T>>,
  options?: Omit<UseQueryOptions<PaginatedResult<T>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey,
    queryFn: fetcher,
    placeholderData: (previous) => previous,
    ...options,
  });
}

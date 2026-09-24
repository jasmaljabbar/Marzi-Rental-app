import { useState } from "react";
import { apiErrorMessage } from "../api/http";

export interface BulkOperationResult<T> {
  succeeded: T[];
  failed: Array<{ item: T; error: string }>;
}

// Bulk archive/delete/import for equipment, customers and categories run as a
// sequential loop over the single-item endpoints, with per-item error capture
// so one failure doesn't abort the batch or hide which rows failed. (Rental
// returns use the transactional POST /rentals/return instead.)
export function useBulkOperation<T>() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function run(items: T[], action: (item: T) => Promise<unknown>): Promise<BulkOperationResult<T>> {
    setIsRunning(true);
    setProgress({ done: 0, total: items.length });
    const result: BulkOperationResult<T> = { succeeded: [], failed: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await action(item);
        result.succeeded.push(item);
      } catch (err) {
        result.failed.push({ item, error: apiErrorMessage(err).detail });
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setIsRunning(false);
    return result;
  }

  return { run, isRunning, progress };
}

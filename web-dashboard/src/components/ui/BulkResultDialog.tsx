import { CheckCircle2, XCircle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import type { BulkOperationResult } from "../../hooks/useBulkOperation";

interface BulkResultDialogProps<T> {
  open: boolean;
  onClose: () => void;
  result: BulkOperationResult<T> | null;
  itemLabel: (item: T) => string;
  onRetryFailed?: (items: T[]) => void;
  isRetrying?: boolean;
}

export function BulkResultDialog<T>({ open, onClose, result, itemLabel, onRetryFailed, isRetrying }: BulkResultDialogProps<T>) {
  if (!result) return null;
  const { succeeded, failed } = result;

  return (
    <Modal open={open} onClose={onClose} title="Bulk action results" size="md">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {succeeded.length} of {succeeded.length + failed.length} succeeded
        {failed.length > 0 ? `, ${failed.length} failed.` : "."}
      </p>

      {succeeded.length > 0 && (
        <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-sm">
          {succeeded.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {itemLabel(item)}
            </li>
          ))}
        </ul>
      )}

      {failed.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
          {failed.map(({ item, error }, i) => (
            <li key={i} className="flex items-start gap-2 text-red-700 dark:text-red-400">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {itemLabel(item)} — {error}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {failed.length > 0 && onRetryFailed && (
          <Button onClick={() => onRetryFailed(failed.map((f) => f.item))} isLoading={isRetrying}>
            Retry failed ({failed.length})
          </Button>
        )}
      </div>
    </Modal>
  );
}

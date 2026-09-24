import { Loader2 } from "lucide-react";
import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("h-5 w-5 animate-spin text-indigo-600", className)} />;
}

export function LoadingRow({ colSpan, label = "Loading…" }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Spinner className="h-4 w-4" />
          {label}
        </span>
      </td>
    </tr>
  );
}

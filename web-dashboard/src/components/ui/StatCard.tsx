import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "neutral" | "indigo" | "emerald" | "amber" | "red";
  hint?: string;
}

const TONE_ICON_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export function StatCard({ label, value, icon: Icon, tone = "neutral", hint }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
      {Icon && (
        <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONE_ICON_CLASSES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </Card>
  );
}

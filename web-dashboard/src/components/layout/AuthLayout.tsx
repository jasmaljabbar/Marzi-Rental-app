import type { ReactNode } from "react";
import { Boxes } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Shared shell for the unauthenticated pages (Login/Signup/ForgotPassword) — a
// glassmorphism card over a soft gradient, replacing the old flat white panel.
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-600/10" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Boxes className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-50">RentalOps</span>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60 dark:shadow-black/20">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

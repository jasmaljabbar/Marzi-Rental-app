import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  // Short helper text under the field, linked via aria-describedby.
  hint?: string;
}

const fieldClasses =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:disabled:bg-slate-800";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, id, type, ...rest }, ref) {
  // Fall back to a generated id so <label htmlFor> is always correctly wired
  // to the field even when the caller doesn't pass an explicit id/name —
  // without this, screen readers (and anything using accessible-name
  // queries) can't associate the label with its input at all.
  const generatedId = useId();
  const inputId = id ?? rest.name ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null].filter(Boolean).join(" ") || undefined;

  const input = (
    <input
      ref={ref}
      id={inputId}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      type={isPassword && showPassword ? "text" : type}
      className={clsx(fieldClasses, isPassword && "pr-9", error && "border-red-400", className)}
      {...rest}
    />
  );

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        input
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export { fieldClasses };

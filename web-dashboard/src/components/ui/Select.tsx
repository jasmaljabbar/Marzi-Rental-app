import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { fieldClasses } from "./Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? rest.name ?? generatedId;
  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select ref={ref} id={selectId} className={clsx(fieldClasses, error && "border-red-400", className)} {...rest}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

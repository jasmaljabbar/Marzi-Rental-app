import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import { fieldClasses } from "./Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...rest },
  ref
) {
  const generatedId = useId();
  const areaId = id ?? rest.name ?? generatedId;
  return (
    <div>
      {label && (
        <label htmlFor={areaId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea ref={ref} id={areaId} className={clsx(fieldClasses, error && "border-red-400", className)} {...rest} />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

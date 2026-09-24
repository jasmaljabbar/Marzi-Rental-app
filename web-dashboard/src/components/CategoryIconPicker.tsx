import clsx from "clsx";
import { CATEGORY_ICON_KEYS, categoryIcon } from "../utils/categoryIcons";

interface CategoryIconPickerProps {
  value: string | null;
  onChange: (icon: string) => void;
}

export function CategoryIconPicker({ value, onChange }: CategoryIconPickerProps) {
  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Icon</p>
      <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
        {CATEGORY_ICON_KEYS.map((key) => {
          const Icon = categoryIcon(key);
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              title={key}
              aria-label={key}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-md border transition",
                selected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

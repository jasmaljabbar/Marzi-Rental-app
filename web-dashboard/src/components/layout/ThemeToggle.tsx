import { Sun, Moon, Monitor } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../../context/ThemeContext";
import type { ThemePreference } from "../../context/ThemeContext";

const OPTIONS: Array<{ key: ThemePreference; icon: typeof Sun; label: string }> = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex items-center rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => setPreference(opt.key)}
          title={opt.label}
          aria-label={opt.label}
          className={clsx(
            "rounded p-1.5",
            preference === opt.key
              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          )}
        >
          <opt.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

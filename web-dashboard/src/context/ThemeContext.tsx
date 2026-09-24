import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "rental_admin_theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function loadStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    preference === "system" ? (systemPrefersDark() ? "dark" : "light") : preference
  );

  useEffect(() => {
    function apply() {
      const effective = preference === "system" ? (systemPrefersDark() ? "dark" : "light") : preference;
      setResolvedTheme(effective);
      document.documentElement.classList.toggle("dark", effective === "dark");
    }
    apply();

    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  function setPreference(pref: ThemePreference) {
    localStorage.setItem(THEME_KEY, pref);
    setPreferenceState(pref);
  }

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

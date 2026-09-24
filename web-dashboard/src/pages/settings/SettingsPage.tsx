import { useState } from "react";
import { Tabs } from "../../components/ui/Tabs";
import { Card } from "../../components/ui/Card";
import { ThemeToggle } from "../../components/layout/ThemeToggle";
import { CompanySettings } from "./CompanySettings";
import { ShopsSettings } from "./ShopsSettings";
import { StaffSettings } from "./StaffSettings";

type SettingsTab = "company" | "shops" | "team" | "appearance";

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("company");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Company info, shops, team, and appearance.</p>
      </div>

      <Tabs
        tabs={[
          { key: "company", label: "Company" },
          { key: "shops", label: "Shops" },
          { key: "team", label: "Team" },
          { key: "appearance", label: "Appearance" },
        ]}
        active={tab}
        onChange={(k) => setTab(k as SettingsTab)}
      />

      {tab === "company" && <CompanySettings />}
      {tab === "shops" && <ShopsSettings />}
      {tab === "team" && <StaffSettings />}
      {tab === "appearance" && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Choose light, dark, or match your system setting.</p>
          <ThemeToggle />
        </Card>
      )}
    </div>
  );
}

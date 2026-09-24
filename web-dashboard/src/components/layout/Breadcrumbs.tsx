import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  equipment: "Equipment",
  rentals: "Rentals",
  customers: "Customers",
  expenses: "Expenses",
  categories: "Categories",
  reports: "Reports",
  billing: "Billing",
  settings: "Settings",
  platform: "Platform console",
  accounts: "App users",
};

function labelFor(segment: string) {
  if (LABELS[segment]) return LABELS[segment];
  // Route params (mongo ids) show up as raw hex — render a generic "Detail" crumb instead.
  if (/^[a-f0-9]{24}$/i.test(segment)) return "Detail";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
      <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-200">
        Dashboard
      </Link>
      {segments.map((segment, i) => {
        const to = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={to} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-slate-700 dark:text-slate-200">{labelFor(segment)}</span>
            ) : (
              <Link to={to} className="hover:text-slate-700 dark:hover:text-slate-200">
                {labelFor(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

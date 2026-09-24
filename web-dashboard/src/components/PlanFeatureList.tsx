import { Check, X } from "lucide-react";
import type { Catalog, PlanFeatures } from "../types/models";

// Renders every feature key from the catalog against a plan's feature map —
// generic so a new feature key (added to the backend's config/planCatalog.js)
// shows up automatically, without a new line of UI code.
export function PlanFeatureList({ features, catalog }: { features: PlanFeatures; catalog: Catalog | undefined }) {
  if (!catalog) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {catalog.features.map((def) => {
        const enabled = features[def.key] ?? def.default;
        return (
          <li key={def.key} className="flex items-center gap-2">
            {enabled ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            )}
            <span className={enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}>{def.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

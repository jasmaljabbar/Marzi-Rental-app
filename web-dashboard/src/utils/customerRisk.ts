import type { BadgeTone } from "../components/ui/Badge";
import type { RiskLevel } from "../types/models";

export type { RiskLevel };

// Risk itself is computed by the API from the customer's full history
// (customers?include_stats=true); these are just the display labels.
export const RISK_LABELS: Record<RiskLevel, string> = {
  "high-risk": "High Overdue Risk",
  "good-standing": "Good Standing",
  "low-risk": "Low Risk",
};

export const RISK_TONES: Record<RiskLevel, BadgeTone> = {
  "high-risk": "red",
  "good-standing": "emerald",
  "low-risk": "indigo",
};

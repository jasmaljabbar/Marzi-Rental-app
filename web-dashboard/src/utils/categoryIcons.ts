import {
  Tags,
  Wrench,
  Hammer,
  Drill,
  HardHat,
  Forklift,
  Truck,
  Container,
  Boxes,
  Package,
  Cog,
  Zap,
  Fan,
  Flame,
  Snowflake,
  Tent,
  Cable,
  Axe,
  Shovel,
  Anchor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Mirrors nodejs-backend/src/config/categoryIcons.js's CATEGORY_ICONS list —
// kept in sync manually (no shared package between the two projects, same
// as currencies elsewhere in this app).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Tags,
  Wrench,
  Hammer,
  Drill,
  HardHat,
  Forklift,
  Truck,
  Container,
  Boxes,
  Package,
  Cog,
  Zap,
  Fan,
  Flame,
  Snowflake,
  Tent,
  Cable,
  Axe,
  Shovel,
  Anchor,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function categoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && CATEGORY_ICONS[icon]) || Tags;
}

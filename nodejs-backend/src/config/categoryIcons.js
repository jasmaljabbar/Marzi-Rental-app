// Allow-list of category icon keys — each one must match a lucide-react
// component name exactly, since the frontend looks the icon up by this key
// (see web-dashboard/src/utils/categoryIcons.ts, mirrored by hand same as
// currencies.js — no shared package between the two projects).
const CATEGORY_ICONS = [
  "Tags",
  "Wrench",
  "Hammer",
  "Drill",
  "HardHat",
  "Forklift",
  "Truck",
  "Container",
  "Boxes",
  "Package",
  "Cog",
  "Zap",
  "Fan",
  "Flame",
  "Snowflake",
  "Tent",
  "Cable",
  "Axe",
  "Shovel",
  "Anchor",
];

module.exports = { CATEGORY_ICONS };

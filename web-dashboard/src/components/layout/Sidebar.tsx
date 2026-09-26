import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  Receipt,
  Tags,
  BarChart3,
  CreditCard,
  Settings as SettingsIcon,
  Building2,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { isOwnerOrAdmin } from "../../utils/permissions";
import { useAccountPlan } from "../../hooks/useAccountPlan";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  ownerAdminOnly?: boolean;
  requiresFeature?: string;
}

const LINKS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/equipment", label: "Equipment", icon: Package },
  { to: "/rentals", label: "Rentals", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/reports", label: "Reports", icon: BarChart3, ownerAdminOnly: true, requiresFeature: "analytics" },
  { to: "/billing", label: "Billing", icon: CreditCard, ownerAdminOnly: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon, ownerAdminOnly: true },
  { to: "/profile", label: "My profile", icon: UserRound },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { hasFeature } = useAccountPlan();
  const links = LINKS.filter(
    (link) => (!link.ownerAdminOnly || isOwnerOrAdmin(user?.role)) && (!link.requiresFeature || hasFeature(link.requiresFeature))
  );

  const content = (
    <>
      <div className="flex h-14 items-center justify-between px-5">
        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">RentalOps</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="space-y-1 px-3" aria-label="Main">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )
            }
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </NavLink>
        ))}

        {user?.isPlatformAdmin && (
          <NavLink
            to="/platform"
            onClick={onClose}
            className="mt-4 flex items-center gap-2.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            Platform console
          </NavLink>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-900">
        {content}
      </aside>

      {/* Mobile: drawer + overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
          <aside className="relative h-full w-64 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

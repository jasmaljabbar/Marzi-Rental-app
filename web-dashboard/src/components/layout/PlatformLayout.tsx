import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutGrid, LayoutDashboard, Building2, CreditCard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { to: "/platform", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/platform/accounts", label: "App Users", icon: Building2, end: false },
  { to: "/platform/plans", label: "Plans", icon: CreditCard, end: false },
];

export function PlatformLayout() {
  const { user, logout } = useAuth();

  // The route guard sends signed-out visitors of /platform/* to the admin login.
  function handleLogout() {
    logout({ explicit: true });
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-14 items-center px-5 text-lg font-bold text-indigo-600 dark:text-indigo-400">RentalOps Admin</div>
        <nav className="space-y-1 px-3">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`
              }
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        {user?.accountId && (
          <div className="mt-6 px-3">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <LayoutGrid className="h-4 w-4" />
              My shop dashboard
            </Link>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <ThemeToggle />
          <span className="text-sm text-slate-600 dark:text-slate-300">{user?.username}</span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            Platform admin
          </span>
          <button type="button" onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Log out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./lib/queryClient";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ShopProvider } from "./context/ShopContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ProtectedRoute, RequireTenant } from "./components/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RequirePlatformAdmin } from "./components/RequirePlatformAdmin";
import { RequireRole } from "./components/RequireRole";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { PlatformLayout } from "./components/layout/PlatformLayout";
import { LoginPage } from "./pages/LoginPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";

// Pages load on demand so the first screen only downloads what it needs.
const AccountsPage = lazy(() => import("./pages/platform/AccountsPage").then((m) => ({ default: m.AccountsPage })));
const AccountDetailPage = lazy(() => import("./pages/platform/AccountDetailPage").then((m) => ({ default: m.AccountDetailPage })));
const PlansPage = lazy(() => import("./pages/platform/PlansPage").then((m) => ({ default: m.PlansPage })));
const PlatformDashboardPage = lazy(() => import("./pages/platform/DashboardPage").then((m) => ({ default: m.PlatformDashboardPage })));
const DashboardHomePage = lazy(() => import("./pages/dashboard/DashboardHomePage").then((m) => ({ default: m.DashboardHomePage })));
const CategoriesPage = lazy(() => import("./pages/categories/CategoriesPage").then((m) => ({ default: m.CategoriesPage })));
const EquipmentListPage = lazy(() => import("./pages/equipment/EquipmentListPage").then((m) => ({ default: m.EquipmentListPage })));
const EquipmentDetailPage = lazy(() => import("./pages/equipment/EquipmentDetailPage").then((m) => ({ default: m.EquipmentDetailPage })));
const RentalsPage = lazy(() => import("./pages/rentals/RentalsPage").then((m) => ({ default: m.RentalsPage })));
const CustomersListPage = lazy(() => import("./pages/customers/CustomersListPage").then((m) => ({ default: m.CustomersListPage })));
const CustomerDetailPage = lazy(() => import("./pages/customers/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage })));
const ExpensesPage = lazy(() => import("./pages/expenses/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const BillingPage = lazy(() => import("./pages/billing/BillingPage").then((m) => ({ default: m.BillingPage })));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));

const queryClient = createQueryClient();

function PageLoading() {
  return (
    <div className="flex h-full items-center justify-center p-8" role="status">
      <Spinner className="h-6 w-6" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme} position="top-right" richColors closeButton />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <ShopProvider>
              <ThemedToaster />
              <BrowserRouter>
                <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/platform/login" element={<AdminLoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<RequirePlatformAdmin />}>
                      <Route path="/platform" element={<PlatformLayout />}>
                        <Route index element={<PlatformDashboardPage />} />
                        <Route path="accounts" element={<AccountsPage />} />
                        <Route path="accounts/:id" element={<AccountDetailPage />} />
                        <Route path="plans" element={<PlansPage />} />
                      </Route>
                    </Route>

                    <Route element={<RequireTenant />}>
                    <Route element={<DashboardLayout />}>
                      <Route path="/" element={<DashboardHomePage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/equipment" element={<EquipmentListPage />} />
                      <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
                      <Route path="/rentals" element={<RentalsPage />} />
                      <Route path="/customers" element={<CustomersListPage />} />
                      <Route path="/customers/:id" element={<CustomerDetailPage />} />
                      <Route path="/expenses" element={<ExpensesPage />} />

                      <Route element={<RequireRole roles={["owner", "admin"]} />}>
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/billing" element={<BillingPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Route>
                    </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </ShopProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

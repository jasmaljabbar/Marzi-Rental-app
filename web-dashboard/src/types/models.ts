// Mirrors the JSON shapes returned by the nodejs-backend DTO mappers
// (nodejs-backend/src/dto/index.js): snake_case, ObjectId strings for ids.
export type Id = string;

export type Role = "owner" | "admin" | "staff";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  username: string;
  role: Role;
  account_id?: Id | null;
  is_platform_admin?: boolean;
  // Short code of the business, needed at login when a username exists in
  // more than one business.
  business_code?: string | null;
  shop_id?: Id | null;
  // Only present on the POST /auth/register response (new tenant signup).
  trial_ends_at?: string;
}

export interface Me {
  id: Id;
  username: string;
  email: string | null;
  role: Role;
  account_id: Id | null;
  shop_id: Id | null;
  business_code: string | null;
  company_name: string | null;
  is_platform_admin: boolean;
}

export interface StaffUser {
  id: Id;
  username: string;
  email: string | null;
  role: Role;
  shop_id: Id | null;
  created_at: string;
  last_login_at: string | null;
}

// Keyed by whatever limit/feature keys config/planCatalog.js on the backend
// defines — new keys need no change here, since these are plain records
// rather than fixed interfaces. See CatalogLimitDef/CatalogFeatureDef below
// for the labeled registry used to render/describe them generically.
export type PlanLimits = Record<string, number>;
export type PlanFeatures = Record<string, boolean>;

export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: Id;
  key: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: BillingCycle;
  currency: string;
  trial_days: number | null;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
  limits: PlanLimits;
  features: PlanFeatures;
}

// Registry entries from GET /catalog — the single source of truth for what
// limit/feature keys exist, used to render the platform admin's Plan form
// and any generic usage/feature list without hardcoding key names.
export interface CatalogLimitDef {
  key: string;
  resource: string;
  label: string;
  unit: string;
  description: string;
  default: number;
}

export interface CatalogFeatureDef {
  key: string;
  label: string;
  description: string;
  default: boolean;
}

export interface CatalogCurrencyDef {
  code: string;
  symbol: string;
  label: string;
}

export type PaymentMethod = "Cash" | "UPI" | "Card" | "Bank Transfer" | "Other";

export interface Catalog {
  limits: CatalogLimitDef[];
  features: CatalogFeatureDef[];
  billing_cycles: BillingCycle[];
  currencies: CatalogCurrencyDef[];
  category_icons?: string[];
  payment_methods?: PaymentMethod[];
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  created_at: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired" | "suspended";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  current_period_start: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  auto_renew: boolean;
  remaining_days: number | null;
}

export interface UsageMetric {
  used: number;
  limit: number | null; // null = unlimited
  percent: number;
}

export interface AccountUsage {
  shops: UsageMetric;
  equipment: UsageMetric;
  customers: UsageMetric;
  staff_users: UsageMetric;
  active_rentals_this_month: UsageMetric;
}

// One row in the "App Users" (tenant accounts) list.
export interface AccountSummary {
  id: Id;
  company_name: string;
  business_code: string | null;
  owner_username: string | null;
  shop_count: number;
  plan: { key: string; name: string } | null;
  status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  remaining_days: number | null;
  auto_renew: boolean | null;
  created_at: string;
}

export interface AccountShop {
  id: Id;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountUser {
  id: Id;
  username: string;
  role: Role;
  created_at: string;
  last_login_at: string | null;
}

// Full detail for one tenant account.
export interface AccountDetail {
  id: Id;
  company_name: string;
  business_code: string | null;
  created_at: string;
  subscription: SubscriptionInfo | null;
  plan: Plan | null;
  usage: AccountUsage;
  shops: AccountShop[];
  users: AccountUser[];
}

// Shape of the { detail, code, ... } error body the backend returns on failures.
export interface ApiErrorBody {
  detail: string;
  code?:
    | "NO_SUBSCRIPTION"
    | "TRIAL_EXPIRED"
    | "SUBSCRIPTION_INACTIVE"
    | "ACCOUNT_SUSPENDED"
    | "PLAN_LIMIT_REACHED"
    | "FEATURE_NOT_AVAILABLE"
    | "PLATFORM_ADMIN_USE_ADMIN_LOGIN"
    | "BUSINESS_CODE_REQUIRED"
    | "SHOP_NOT_ACCESSIBLE"
    | "NO_ACTIVE_SHOP"
    | "VALIDATION_ERROR"
    | "INSUFFICIENT_STOCK"
    | string;
  errors?: Array<{ path: string; message: string }>;
  [extra: string]: unknown;
}

// The logged-in user's session, persisted client-side. A user can be a
// platform admin AND a tenant user at the same time (independent axes on the
// backend — see middleware/platformAdmin.js vs middleware/rbac.js), so both
// identities are kept rather than treated as mutually exclusive.
export interface CurrentUser {
  username: string;
  role: Role;
  accountId: Id | null;
  isPlatformAdmin: boolean;
  businessCode?: string | null;
}

// ---- Shops (tenant-facing) ----

export interface Shop {
  id: Id;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopSummary {
  id: Id;
  name: string;
  equipment_count: number;
  customer_count: number;
  active_rentals: number;
}

// ---- Account (tenant-facing "my account", distinct from the platform's AccountDetail) ----

export interface TenantAccount {
  id: Id;
  company_name: string;
  business_code: string | null;
  currency: string;
  created_at: string;
  subscription: SubscriptionInfo | null;
  plan: Plan | null;
}

export interface CompanyInfo {
  company_name: string | null;
  business_code?: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  footer_note: string | null;
  default_tax_rate_percent: number;
  currency: string;
}

export interface TenantSubscription extends SubscriptionInfo {
  plan: Plan | null;
}

// ---- Categories ----

export interface Category {
  id: Id;
  name: string;
  icon: string | null;
  sort_order: number;
  sync_id: string;
  shop_id: Id | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Equipment ----

export type MaintenanceAction = "Damage" | "Repair" | "Scrap";

export interface MaintenanceLog {
  id: Id;
  equipment_id: Id;
  action: MaintenanceAction;
  quantity: number;
  remark: string | null;
  cost: number;
  photos: string[];
  rental_id: Id | null;
  customer_id: Id | null;
  created_at: string;
}

export interface Equipment {
  id: Id;
  sync_id: string;
  name: string;
  description: string | null;
  stock_count: number;
  rent_per_day: number;
  deposit_amount: number;
  purchase_price_per_unit: number;
  useful_life_years: number;
  images: string[];
  // Small WebP previews for lists, same order as `images`.
  image_thumbs: string[];
  available_count: number;
  category_id: Id;
  shop_id: Id | null;
  damaged_count: number;
  maintenance_logs: MaintenanceLog[];
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = "Pending" | "Partial" | "Paid";

export interface PartyRef {
  id: Id;
  name: string;
  phone?: string;
  // Customers embedded in rentals carry their photo thumbnail.
  photo_thumb_url?: string | null;
}

export interface EquipmentSale {
  id: Id;
  sync_id: string;
  equipment_id: Id;
  customer_id: Id;
  customer?: PartyRef;
  equipment?: PartyRef;
  quantity: number;
  selling_price: number;
  total_price: number;
  book_value_per_unit: number;
  total_book_value: number;
  gain_loss: number;
  amount_paid: number;
  amount_due: number;
  payment_status: PaymentStatus;
  sold_at: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentSalesSummary {
  sales_count: number;
  units_sold: number;
  total_revenue: number;
  total_book_value: number;
  total_gain_loss: number;
  total_paid: number;
  total_due: number;
  by_equipment: Array<{
    equipment_id: Id;
    equipment_name: string;
    units_sold: number;
    revenue: number;
    book_value: number;
    gain_loss: number;
  }>;
}

// ---- Customers ----

export type RiskLevel = "high-risk" | "good-standing" | "low-risk";

// Returned when listing with include_stats=true, and on GET /customers/:id.
export interface CustomerStats {
  total_rentals: number;
  active_rentals: number;
  overdue_returns: number;
  amount_due: number;
  overdue_payments: number;
  risk: RiskLevel;
}

export interface Customer {
  id: Id;
  sync_id: string;
  name: string;
  phone: string;
  address: string | null;
  // Private files: these are short-lived signed links, refetch rather than store.
  doc_url: string | null;
  photo_url: string | null;
  photo_thumb_url: string | null;
  stats?: CustomerStats;
  shop_id: Id | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Rentals ----

export type RentalStatus = "Active" | "Completed" | "Cancelled";

export interface Rental {
  id: Id;
  sync_id: string;
  // Lines created together share an order id.
  order_id: string | null;
  customer_id: Id;
  equipment_id: Id;
  // Embedded by list/detail endpoints, so no client-side joins are needed.
  customer?: PartyRef;
  equipment?: PartyRef;
  expected_return_date: string | null;
  quantity: number;
  // Rate agreed when the rental started.
  daily_rate: number | null;
  advance_amount: number;
  remark: string | null;
  rented_at: string;
  returned_at: string | null;
  gross_amount: number | null;
  total_price: number;
  status: RentalStatus;
  discount_amount: number;
  late_fee_amount: number;
  damage_amount: number;
  tax_rate_percent: number;
  tax_amount: number;
  amount_paid_on_return: number;
  refund_amount: number;
  amount_due: number;
  due_date: string | null;
  return_revenue_amount: number;
  payment_status: PaymentStatus;
  invoice_number: string | null;
  shop_id: Id | null;
  updated_at: string;
}

export type PaymentKind = "advance" | "return" | "due" | "sale" | "refund";

export interface Payment {
  id: Id;
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod;
  received_at: string;
  customer_id: Id | null;
  rental_id: Id | null;
  sale_id: Id | null;
  order_id: string | null;
  note: string | null;
}

export interface ReturnDamageInput {
  rental_id: Id;
  amount?: number;
  damaged_quantity?: number;
  photos?: string[];
  remark?: string;
}

export interface ReturnInput {
  rental_ids: Id[];
  discount_amount?: number;
  late_fee_amount?: number;
  damage_amount?: number;
  damages?: ReturnDamageInput[];
  tax_rate_percent?: number;
  amount_paid?: number;
  due_date?: string | null;
  payment_method?: PaymentMethod;
}

export interface ReturnLine {
  rental_id: Id;
  days: number;
  daily_rate: number;
  quantity: number;
  gross_amount: number;
  discount_amount: number;
  late_fee_amount: number;
  damage_amount: number;
  subtotal: number;
  tax_rate_percent: number;
  tax_amount: number;
  total_amount: number;
  advance_amount: number;
  pending_before_payment: number;
  refund_amount: number;
  paid_now: number;
  amount_due: number;
  payment_status: PaymentStatus;
}

export interface ReturnPreview {
  returned_at: string;
  lines: ReturnLine[];
  totals: {
    gross_amount: number;
    discount_requested: number;
    discount_amount: number;
    discount_capped: boolean;
    discount_cap_percent: number | null;
    late_fee_amount: number;
    damage_amount: number;
    tax_amount: number;
    total_amount: number;
    advance_amount: number;
    refund_amount: number;
    paid_now: number;
    amount_due: number;
  };
}

// ---- Expenses ----

export interface Expense {
  id: Id;
  category: string;
  amount: number;
  remark: string | null;
  payment_mode: string;
  receipt_url: string | null;
  equipment_id: Id | null;
  recurring_template_id: Id | null;
  date: string;
  is_archived: boolean;
  archived_at: string | null;
}

export interface RecurringExpenseTemplate {
  id: Id;
  category: string;
  amount: number;
  remark: string | null;
  day_of_month: number;
  equipment_id: Id | null;
  is_active: boolean;
  created_at: string;
}

// ---- Inventory ----

export type InventoryTransactionType = "INITIAL_STOCK" | "STOCK_IN" | "SCRAP" | "SALE";

export interface InventoryTransaction {
  id: Id;
  equipment_id: Id;
  transaction_type: InventoryTransactionType;
  quantity: number;
  unit_price: number;
  total_cost: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  created_at: string;
}

export interface InventorySummary {
  total_stock_cost: number;
}

// ---- Reports ----

export interface NetProfitReport {
  range_start: string;
  range_end: string;
  rental_revenue: number;
  equipment_sale_revenue: number;
  revenue: number;
  operating_expenses: number;
  depreciation_expense: number;
  depreciation_by_equipment: Array<{ equipment_id: Id; equipment_name: string; depreciation: number }>;
  net_profit_by_equipment: Array<{
    equipment_id: Id;
    equipment_name: string;
    revenue: number;
    operating_expenses: number;
    depreciation: number;
    net_profit: number;
  }>;
  net_profit: number;
}

export interface DashboardReport {
  generated_at: string;
  active_rentals: number;
  overdue_count: number;
  due_soon_count: number;
  alerts: Array<{ rental: Rental; days_until_due: number }>;
  revenue: { this_month: number; last_month: number; trend_percent: number | null };
  inventory: {
    items: number;
    on_hand_units: number;
    damaged_units: number;
    rented_out_units: number;
    fleet_size: number;
    utilization_percent: number;
    low_stock_threshold: number;
    low_stock_count: number;
  };
  customers_count: number;
  categories_count: number;
  outstanding_due: { amount: number; rentals: number; overdue_rentals: number };
}

export interface ReportSummary {
  range_start: string;
  range_end: string;
  bucket: "day" | "month";
  money_received: number;
  money_received_all_time: number;
  equipment_sale_revenue: number;
  expenses: number;
  expenses_all_time: number;
  net_cash: number;
  net_all_time: number;
  completed_count: number;
  cancelled_count: number;
  active_count: number;
  rentals_started_in_range: number;
  gross_all_time: number;
  collection_rate: number;
  trend: Array<{ bucket: string; income: number; expense: number }>;
  expense_breakdown: Array<{ category: string; amount: number }>;
  revenue_by_category: Array<{ category: string; amount: number }>;
  top_equipment: Array<{ equipment_id: Id; equipment_name: string; revenue: number; count: number }>;
  top_customers: Array<{ customer_id: Id; customer_name: string; revenue: number; count: number }>;
}

// ---- Settings ----

export interface Setting {
  id: Id | null;
  key: string;
  value: string | null;
}

// ---- Client-side pagination result (see api/pagination.ts) ----

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

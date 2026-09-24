# Screen and feature catalogue

Paths below are in `mobile-app/src/screens/`. Exact controls, handlers, conditions, text and styles are in the matching `evidence/<Screen>.tsx.md` document. All screens: source inventoried; Flutter not implemented; runtime parity not tested.

| Route / source file | Features and visible states | Data / side effects |
|---|---|---|
| Login / LoginScreen | Branded warehouse icon, decorative background, username/password, visibility control, loading/error; forgot-password request/reset modal; Signup link | Auth login; reset request/code/new password; persist session |
| Signup / SignupScreen | Business name, username, password; free-trial messaging; loading/error; login link | Register isolated business, persist session |
| Home / HomeScreen | Customer selector and phone search, inline new customer, warnings for ongoing/due rentals; searchable equipment cards/category colors, customer-specific picks, quantity/draft controls, clear confirmation, conflict transfer, reservation notices, confirm rental | Customers/equipment/categories/active rentals; reservation poll 8s, notices 12s and ack; server upsert/delete/clear/transfer |
| Inventory / InventoryScreen | Search, category picker/search/create, equipment cards, availability, images, add equipment and add-stock sheets, Rent shortcut | Equipment first 200, categories; create equipment/category, add stock; detail route |
| Customers / CustomersScreen | Name/phone search, avatars, active/overdue/pending indicators, add/edit form, delete confirmation, detail link | Customer search first 200; active/history joins; create/update/delete |
| Rentals / RentalsScreen | Ongoing/history, date filters, customer grouping and selections, in-memory bundle creation modal, rental details/edit, individual and batch returns, payment, QR modal, invoice links, phone action, cancel | Active/history including cancelled, customers/equipment/settings; bulk create, edit, complete sequentially for batch, cancel, payment |
| Expenses / ExpensesScreen | Totals and current-month metric, category chips, search by category/remark, add/edit category/amount/note/payment mode/receipt, delete confirmation | Expense list/create/update/delete, receipt upload |
| Damaged / DamagedScreen | Damaged equipment cards, damage history/photos/customer context, repair cost/remark sheet, empty state | Equipment/customer lists; Repair maintenance, equipment/expense invalidation |
| More / MoreScreen | User hero, Dashboard/Master/Reports/Plan/Invoices shortcuts, Light/Dark/System, discount-cap setting, company settings, logout confirmation, status/support/version | Account/catalog feature gate, local setting read/write, `/stats`, tel/mailto configured support, session/cache clear |
| Dashboard / DashboardScreen | Overdue/due-soon alerts, stock/damage metrics, financial/customer overview, low-stock snapshot, quick links, scroll-to-alerts | Equipment/customers/rentals/sales/categories; analytics gate |
| Master / MasterScreen | Category add/search, counts and attached equipment, prevent delete when category in use, delete confirmation | Categories; equipment first 500; category create/delete |
| Reports / ReportsScreen | Payment/revenue metrics, day/month/year periods, expense breakdown, sales/book value/gain-loss, server net-profit, date-specific rental report preview (first 4), PDF generation/save/share | Active/history/expenses/customers/equipment/sales/summary/net-profit; local report PDF |
| AccountStatus / AccountStatusScreen | Loading, legacy-account fallback, subscription state/trial dates, plan price, usage/limits, generic feature list | `/account/me`, `/account/usage`, `/catalog` |
| EquipmentDetail / EquipmentDetailScreen | Image/detail/stock, edit/delete, add stock, Damage/Repair (feature-gated), scrap, sell to customer, rental/history context, return/QR | Equipment/rental/customer lists/local QR; equipment operations/sale/complete |
| CustomerDetail / CustomerDetailScreen | Identity/document/photo, ongoing/history/sales and dues, individual/batch return, late fee/discount/payment/reminder, optional damage report with max 3 photos, rental/sale payment, QR/invoice | Customer/rental/equipment/sales/settings; return then independent damage call; payment calls |
| RentalForm / RentalFormScreen | Customer and chosen items, quantities with server hold sync/revert, 42-cell calendar without past selection, optional return date/advance/remark/free accessory switch, totals, conflict transfer | Bulk rental create; reservation upsert/transfer/clear; reset Home then CustomerDetail |
| Invoice / InvoiceScreen | Loading/error/retry, branded header, customer block, items, charge summary, footer, Share/Print/Download action bar | Invoice detail; server PDF bytes; cache/native file/share/print adapters |
| InvoiceList / InvoiceListScreen | Search invoice/customer, payment-status chips, loading/error/empty, invoice cards/detail link | Invoices first 200 with search/status |
| CompanySettings / CompanySettingsScreen | Loading, legacy 404 notice, company name display; address/phone/email/tax ID/default tax/footer and branding logo upload gated by plan | Get/update company, upload logo; account role errors from backend |
| Unregistered / AddRentalScreen | Older standalone add-rental UI; no navigator registration or importing screen found | Retained source only; not an active user route |

## Shared workflows beyond route count

CustomerForm is used in Home and Customers. EquipmentForm appears in Inventory and EquipmentDetail. Camera overlays include guided headshot/crop and document capture; gallery alternatives and permission-denied states matter. ZoomableImage, DatePickerField, ReservationConflictModal, RentalDetailModal, BatchReturnModal, ConfirmDialog, Toast and modal ToastLayer must be matched. Invoice UI has six content components plus action bar. Do not substitute stock Flutter Material defaults for the existing controls.

No screen exposes the older backup import/export, admin password unlock, local user creation, user list/edit/delete, or change-password service methods in this revision. Document them as dormant compatibility contracts rather than inventing menu entries.

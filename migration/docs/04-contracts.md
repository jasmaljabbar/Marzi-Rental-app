# API and persistence contracts

## Transport

Source: `mobile-app/src/api/http.ts`, `services.ts`, `types/models.ts`. Default host is `http://localhost:5000/`, overridden by `EXPO_PUBLIC_API_URL`; one trailing slash is stripped. Read token from AsyncStorage on every request; send `Authorization: Bearer <token>` when nonempty. JSON requests include Content-Type; multipart does not explicitly set boundary. No HTTP timeout, refresh-token flow, or automatic logout-on-401 is implemented here. React Query applies its own defaults; do not confuse query retries with transport retries or mutation replay.

Success text is JSON-decoded; empty text returns `{}`. Errors preserve status and parsed body, prefer `detail`, then `message`, then `HTTP <status>`. List responses are arrays with X-Total-Count/X-Total-Pages headers. Facade recalculates totalPages from totalCount/page_size, minimum 1. Query helper drops null/undefined/empty strings, retains 0 and false, URI-encodes names and values. IDs are strings in current wire models; legacy SQLite IDs are integers.

Exact payload expressions and line references: [API evidence](evidence/api-call-sites.md). Complete wire field definitions remain in `mobile-app/src/types/models.ts`; inventory preserves imports and source references without replacing optional/null semantics.

## Endpoint catalogue

`P` means POST, `G` GET, `U` PUT, `D` DELETE. Facade methods without visible callers are identified separately below. All paths relative to host.

| Domain | Method / paths | Request / response contract |
|---|---|---|
| Startup | G `/health` | status; then local auth_mode write |
| Login / register | P `/auth/login`, `/auth/register` | username/password; register adds company_name; token, username, role (register also account information) |
| Password reset | P `/auth/request-reset/{encodedUsername}`, `/auth/reset-password` | request may return reset_code_for_demo; confirm username/reset_code/new_password |
| User management | P `/auth/signup`; G `/auth/users`; U/D `/auth/users/username/{encodedUsername}` | create username/password; update new_username/new_password; mapped LocalAuthUserSummary |
| Account | G `/account/me`, `/account/usage`, `/catalog` | plan/subscription, limits and used counts, generic feature/limit registry |
| Company | G/U `/account/company` | editable company fields excluding company_name; backend admin/owner write |
| Categories | G/P `/categories`; D `/categories/{id}` | name; `{id,name}` |
| Equipment | G/P `/equipment`; U/D `/equipment/{id}` | list page/page_size/search/category_id; name/description/rates/life/category/images; create stock/damaged counts, update omits stock |
| Stock | P `/equipment/{id}/stock` | quantity_added, unit_price, note |
| Maintenance | P `/equipment/maintenance` | equipment_id, action Damage/Repair, remark, cost default 0, photos default [], optional rental_id/customer_id |
| Scrap | P `/equipment/{id}/scrap` | quantity, remark |
| Sales | P `/equipment/{id}/sell`; G `/equipment/sales`; P `/equipment/sales/{id}/payment`; G `/equipment/sales/summary` | sell customer_id/quantity/selling_price/amount_paid/remark; list pagination/customer/equipment/payment status; payment amount_paid; summary start/end dates |
| Inventory | G `/inventory/summary`, `/inventory/transactions` | summary object; transactions via paginated wrapper |
| Customers | G/P `/customers`; U/D `/customers/{id}` | list page/page_size/search; write name/phone/address/doc_url/photo_url |
| Rentals | G `/rentals`, `/rentals/history`; P `/rentals`, `/rentals/bulk` | active injects status=Active; history include_cancelled; optional date_from/date_to; create customer/equipment/quantity/date/advance/remark; bulk items array and returns Rental[] |
| Return | P `/rentals/{id}/complete` | discount_amount, amount_paid_on_return, optional due_date, late_fee_amount, tax_rate_percent; falsey late fee/due date omitted |
| Rental payment/edit/cancel | P `/rentals/{id}/payment`; U `/rentals/{id}`; P `/rentals/{id}/cancel` | payment amount_paid/optional discount/due; edit optional date (nullable), quantity, advance, remark (nullable) |
| Reservation | G/P `/reservations`; D `/reservations/{id}`, `/reservations/customer/{customerId}`; P `/reservations/{id}/transfer` | optional customer_id list; upsert customer_id/equipment_id/quantity; transfer to_customer_id |
| Notices | G `/reservations/notices`; P `/reservations/notices/{id}/ack` | unread notices, acknowledgement |
| Expenses | G/P `/expenses`; U/D `/expenses/{id}` | category/amount, optional remark/payment_mode/receipt_url/equipment_id |
| Invoices | G `/invoices`, `/invoices/{rentalId}`, `/invoices/{rentalId}/pdf` | list pagination/search/payment_status/date_from/date_to; detail InvoiceDetail; PDF binary (not JSON wrapper) |
| Reports | G `/reports/net-profit` | start_date/end_date; NetProfitReport |
| Upload | P `/upload` multipart | field `file`; native URI/name/type, web blob; `{url}` response |
| Connection status | G `/stats` | mode/storage/counts/lastCheckedAt; runNow just reads status |

`equipmentApi.getById` does NOT call the backend detail endpoint: it fetches the first 200 and finds locally, catching errors to null. Single rental create, inventory facade operations, user management, backup, and various other service methods may exist without registered-screen callers; use AST call inventory to distinguish a facade API from an active UI feature. Backend-only archive/restore/duplicate, recurring expenses, platform admin, subscription management and customer statement endpoints are not new mobile routes.

Reservation upsert maps HTTP 409 into conflict error with `conflict` and `availableForYou`. Preserve this structured error to drive transfer dialog. Backend auth, tenancy, plan limits, maintenance feature checks, and role restrictions are authoritative even when a mobile action is visible. Sales, scrap and destructive operations can reject staff. Never turn a server rejection into local success.

## Storage ownership

| Store | Content and behavior |
|---|---|
| AsyncStorage | `token`, `username`, `role`, `theme_mode`; login/register writes session; logout removes first three; invalid/missing theme becomes system |
| SQLite native | `nbtools-offline.db`, schema version 2; migrations at startup, WAL and foreign-key behavior in database module |
| SQLite web | `:memory:`; persistence flag false; removes `nbtools-offline-db-snapshot-v1`; not durable across reload |
| app_settings | key/value strings, ordered list, update then insert; auth_mode=cloud, qr_code default empty, max_discount_percent, legacy sync settings |
| Legacy tables | app_meta, app_settings, local_users, categories, customers, equipment, equipment_images, maintenance_logs, rentals, rental_items, expenses, inventory_transactions, sync_tombstones |
| Legacy sync columns | sync_id, sync_status default pending, last_synced_at, server_updated_at, selected updated_at backfills; retained despite no active sync transport |
| React Query | memory-only cache; invalidations are per key prefix; logout clears cache |
| Native files | document uploads/reports/backups directories; invoices under cache/invoices keyed by sanitized invoice number |
| Web files | nbtools-upload-* keys, web-storage:// references; data-URI fallback on quota; remote URL references not embedded automatically |
| Drafts | Home persisted remotely by customer; Rentals bundles only in component memory |

## Backup and migration compatibility

Legacy format `nbtools-sqlite-backup`, version 1, app.schemaVersion 2, exportedAt, tables, files with sourcePath/fileName/mimeType/base64 data. Import validates format and rejects newer schema, prepares schema, restores/remaps embedded files, clears/inserts tables in dependency order, verifies counts, and reports progress/skipped data. Browser has special batched and auxiliary-table behavior. Restore is not a cloud-data import. No current screen exposes these methods.

Do not migrate real device data implicitly or point test writes at production. Development Flutter should have a separate app identifier and database. A future in-place release needs a read-only export/copy of original data and explicit cross-framework storage bridging; simply using the same SQLite filename or shared-preferences key does not grant access to Expo/AsyncStorage data. Preserve legacy backup parsing as a separate compatibility module; do not reinterpret local integer IDs as cloud IDs. Rollback is reopening the untouched React Native app; shared cloud writes cannot be undone by uninstalling Flutter.

# Form, business-rule and visual parity

Exact handler/conditional/control source appears in the per-screen and per-component evidence documents. Rules below distinguish client checks from server validation. Do not add stricter validation just because it seems conventional.

## Forms and validation

| Form | Original behavior |
|---|---|
| Login | Trim username, preserve password; generic “Login failed. Check username/password.” on failure; session persistence after success |
| Signup | Require trimmed business and username; password at least 8 characters; preserve server error |
| Forgot password | Nonempty trimmed username; optional demo reset code populated into reset UI; require code and new password; then success toast and prefill login username |
| Customer | Trim and require name/phone; no client phone-format validation; blank address/document/photo become null; gallery photo crop 1:1 quality .6, document quality .8 no crop |
| Equipment | Require trimmed name and category; numeric fields use Number or 0, useful life Number or 5; default stock 1; max 4 images at quality .7; update hides stock editing in favor of stock action |
| Category | Require trimmed name; Master refuses deletion if its fetched equipment list uses category; API still validates |
| Add stock | Quantity, unit price and note converted in handler; server validates remaining restrictions |
| Scrap / sale | Positive quantity; sale requires customer; price/payment converted numerically; server checks stock/role/amounts |
| Expense | Nonblank category, amount >0; payment mode/optional receipt and remark; add/edit/delete states and upload errors |
| RentalForm | Date optional but must parse; qty defaults via Number(value) or 1; no item/over-stock blocks; advance may not exceed client estimate; free-addon switch appends literal remark “Customer took free add-on / accessory items.” |
| Rental edit modal | Only Active editable; quantity input removes non-digits and clamps minimum 1; return date allows past; blank date/remark nullable |
| Customer return | Discount/paid/late fee/reminder, optional damage description/cost/photos max 3; complete first, then damage request; report warning if damage fails after successful return |
| Rentals return | Discount/paid/late fee; distinct form without customer-detail damage/reminder fields |
| Equipment return | Discount/paid with different follow-up flow; no automatic invoice navigation |
| Batch return | Starts with all selected, resets discount/paid/due each open; removable items; proportional allocation; optional due date only with pending; confirm disabled if pending or no selected IDs |
| More discount rule | Clamp numeric input to 0–100, nonnumeric becomes 0; 0 removes cap; local SQLite only |
| Company | Read-only company name; editable address/phone/email/tax ID/default tax/footer/logo; branding feature controls logo action; server validates update |

## Calculations and financial edge cases

`daysSince`: max(ceil((now - rented_at)/86,400,000),1). This is elapsed time, not calendar-day inclusivity. Currency helper prefixes `INR ` and uses device locale formatting; do not globally substitute the rupee symbol (some screen strings explicitly use ₹).

Available stock: max(stock_count - damaged_count,0). Home then subtracts other customers' reservations, excluding selected customer's holds. Server creation remains authoritative. Do not additionally subtract active rentals without tracing how server stock is represented.

RentalForm estimate: max(ceil((target local midnight - today local midnight)/day)+1,1), default 1 day. Backend estimate uses elapsed-day ceiling; capture disagreements in tests.

Batch summary: gross=rounded(days × current equipment rent_per_day × max(quantity or 1,1)); missing equipment rate 0. Revenue before discount=max(round(gross-advance),0). Discount distributed by these revenues, payment by discounted revenues. Each allocation rounds to cents, last line receives remainder; payment capped by line revenue, pending floored at 0. The checked-in fixture fixes clock and records original output.

Batch completion makes sequential per-rental POSTs. A later failure can leave earlier rentals completed; there is no atomic batch return. Do not replay the entire sequence automatically. Record partial-success behavior during runtime tests before choosing any approved deviation.

Reports derive advances at rented_at and cumulative paid-on-return at updated_at, else returned_at, else rented_at; this is not a true payment ledger. Gross/discount/due use completed rentals. Collection rate uses collected/gross; expense breakdown groups category; range totals and server net-profit are distinct calculations. Preserve first-page limits and current aggregate definitions until explicitly changed.

Server completion additionally applies its cap, late fees, tax/default company tax and authoritative payment totals. UI estimate cannot replace returned invoice data.

## Visual specification

Source theme: navy primary `#1B365D`, teal accent `#0CBCBA`, light background `#F4F7FB`, white surface; dark primary `#5A8FD4`, accent `#2DD4D2`, background `#0F1623`, surface `#1C2333`. Typography sizes 12/14/16/20/24/30/38, weights 400–900. Spacing 2/4/8/12/16/20/24/32/48; radii 4/8/12/16/20/24/999. Preserve exact per-screen overrides in evidence, not only tokens.

Tab labels 11px bold; height 58+max(bottom inset,8), top padding 6; active underline and icon size increase; notification badge capped to 99+. Preserve seven tabs rather than changing information architecture. Icons are MaterialCommunityIcons; use equivalent glyphs, not arbitrarily similar Material icons. Native app icons are company-icon/company-adaptive assets, intro uses NBlogo. Login/Signup use drawn icon branding rather than intro logo.

Several forms and screens intentionally or incidentally retain fixed light palettes; Home category tint follows system color scheme independently of manual theme preference. Treat these as source deviations to capture, not automatic redesign opportunities.

## Device interactions to capture

Guided selfie crop/retake and document capture, permission rejection and cancellation, image zoom gestures, nested modal toast visibility, keyboard avoidance, date-picker locale/week layout, safe-area and Android back dismissal. PDF invoice uses server bytes: native cache by invoice number, Android directory chooser, iOS share/Save to Files, native print, browser download/share fallback and PDF viewer. Reports generate a separate local HTML/PDF. Stale invoice cache and cancelled save need baseline tests.

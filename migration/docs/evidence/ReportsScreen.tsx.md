# ReportsScreen.tsx

Source: `mobile-app/src/screens/ReportsScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 108:
```tsx
useState(getTodayDateValue)
```

Source line 109:
```tsx
useState<RevenueFilter>("day")
```

Source line 110:
```tsx
useState<GeneratedReport | null>(null)
```

Source line 111:
```tsx
useState(false)
```

Source line 112:
```tsx
useState(false)
```

Source line 113:
```tsx
useState(false)
```

Source line 115:
```tsx
useQuery({ queryKey: ["reports-history"], queryFn: () => rentalApi.history({ page: 1, page_size: 200, include_cancelled: true }) })
```

Source line 115:
```tsx
rentalApi.history({ page: 1, page_size: 200, include_cancelled: true })
```

Source line 116:
```tsx
useQuery({ queryKey: ["reports-active"], queryFn: () => rentalApi.active({ page: 1, page_size: 200 }) })
```

Source line 116:
```tsx
rentalApi.active({ page: 1, page_size: 200 })
```

Source line 117:
```tsx
useQuery({ queryKey: ["reports-expenses"], queryFn: expenseApi.list })
```

Source line 118:
```tsx
useQuery({ queryKey: ["reports-customers"], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 118:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 119:
```tsx
useQuery({ queryKey: ["reports-equipment"], queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }) })
```

Source line 119:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 120:
```tsx
useQuery({ queryKey: ["reports-sales"], queryFn: () => equipmentApi.sales({ page: 1, page_size: 200 }) })
```

Source line 120:
```tsx
equipmentApi.sales({ page: 1, page_size: 200 })
```

Source line 121:
```tsx
useQuery({ queryKey: ["reports-sales-summary"], queryFn: () => equipmentApi.salesSummary() })
```

Source line 121:
```tsx
equipmentApi.salesSummary()
```

Source line 132:
```tsx
useQuery({
    queryKey: ["reports-net-profit", selectedRange.start.toISOString(), selectedRange.end.toISOString()],
    queryFn: () =>
      reportsApi.netProfit({
        start_date: selectedRange.start.toISOString(),
        end_date: selectedRange.end.toISOString(),
      }),
  })
```

Source line 135:
```tsx
reportsApi.netProfit({
        start_date: selectedRange.start.toISOString(),
        end_date: selectedRange.end.toISOString(),
      })
```

Source line 310:
```tsx
toast.success(`Daily report prepared for ${reportDate}.`)
```

Source line 312:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to generate the PDF report.")
```

Source line 324:
```tsx
toast.success(Platform.OS === "web" ? "The generated PDF is ready in the browser context." : `${latest.fileName} was saved on this device.`)
```

Source line 326:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to save the PDF locally.")
```

Source line 340:
```tsx
toast.warning("This device cannot share right now. Save the PDF locally instead.")
```

Source line 350:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to share the PDF report.")
```

## Form controls and modal declarations

Source line 400:
```tsx
<Pressable
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setRevenueFilter(filter)}
              >
```

Source line 589:
```tsx
<TextInput
            style={styles.reportInput}
            value={reportDate}
            onChangeText={setReportDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
          />
```

Source line 600:
```tsx
<Pressable style={styles.primaryActionBtn} onPress={handleGenerate} disabled={isGenerating}>
```

Source line 604:
```tsx
<Pressable style={styles.secondaryActionBtn} onPress={handleSave} disabled={isSaving}>
```

Source line 608:
```tsx
<Pressable style={styles.secondaryActionBtn} onPress={handleShare} disabled={isSharing}>
```

## Conditional behavior

Source line 48:
```tsx
if (status === "Completed") return "Returned";
```

Source line 49:
```tsx
if (status === "Cancelled") return "Cancelled";
```

Source line 82:
```tsx
if (filter === "day") return { start: startOfDay(anchor), end: endOfDay(anchor), label: "Today" };
```

Source line 83:
```tsx
if (filter === "month") return { start: startOfMonth(anchor), end: endOfMonth(anchor), label: "This month" };
```

Source line 88:
```tsx
if (!value) return false;
```

Source line 90:
```tsx
if (Number.isNaN(date.getTime())) return false;
```

Source line 95:
```tsx
if (filter === "day") {
    return anchor.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
```

Source line 98:
```tsx
if (filter === "month") {
    return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
```

Source line 153:
```tsx
if (advanceAmount > 0 && item.rented_at) {
        rows.push({
          key: `advance-${item.id}`,
          amount: advanceAmount,
          receivedAt: item.rented_at,
          customerName,
          itemName,
          note: "Advance received",
        });
      }
```

Source line 164:
```tsx
if (paidOnReturn > 0) {
        rows.push({
          key: `payment-${item.id}`,
          amount: paidOnReturn,
          receivedAt: updatedAt || item.returned_at || item.rented_at,
          customerName,
          itemName,
          note: "Payment received",
        });
      }
```

Source line 297:
```tsx
if (generatedReport && generatedReport.reportDate === reportDate) {
      return generatedReport;
    }
```

Source line 339:
```tsx
if (!isShareAvailable) {
        toast.warning("This device cannot share right now. Save the PDF locally instead.");
        return;
      }
```

## Visible text

Source line 361:
```tsx
Financial Reports
```

Source line 362:
```tsx
Revenue, expenses, and collection performance in one cleaner view.
```

Source line 371:
```tsx
Net Profit / Loss
```

Source line 373:
```tsx
Revenue realized minus total logged expenses
```

Source line 387:
```tsx
Money Received
```

Source line 388:
```tsx
This section uses actual cash collected from customers, including advances and later payments.
```

Source line 415:
```tsx
payment
```

Source line 415:
```tsx
from
```

Source line 415:
```tsx
customer
```

Source line 429:
```tsx
No money received in this view
```

Source line 430:
```tsx
Switch to another filter to see payments from a wider time range.
```

Source line 439:
```tsx
|
```

Source line 451:
```tsx
Equipment Sales
```

Source line 453:
```tsx
Kept separate from rental income. Gain/loss is the difference between the selling price and each unit's remaining book value.
```

Source line 462:
```tsx
Sale revenue
```

Source line 465:
```tsx
sale
```

Source line 465:
```tsx
in this range
```

Source line 500:
```tsx
No equipment sold in this view
```

Source line 501:
```tsx
Switch to another filter to see sales from a wider time range.
```

Source line 514:
```tsx
Sold
```

Source line 514:
```tsx
| Book value
```

Source line 514:
```tsx
|
```

Source line 531:
```tsx
Net Profit (Depreciation Basis)
```

Source line 533:
```tsx
Equipment and stock purchases are spread over each asset's useful life as depreciation, instead of being deducted in full the moment they're bought.
```

Source line 546:
```tsx
Net Profit / Loss
```

Source line 550:
```tsx
Revenue minus operating expenses and depreciation for this range
```

Source line 579:
```tsx
Daily Rental PDF Report
```

Source line 580:
```tsx
Generate the daily transaction report and either save it locally or share it through email and other apps.
```

Source line 583:
```tsx
transaction
```

Source line 588:
```tsx
Report date
```

Source line 619:
```tsx
No transactions for this date
```

Source line 620:
```tsx
The PDF can still be generated, but it will show that no rental activity was found for the selected day.
```

Source line 624:
```tsx
Report Preview
```

Source line 629:
```tsx
|
```

Source line 647:
```tsx
PDF ready
```

Source line 650:
```tsx
Rows included:
```

Source line 651:
```tsx
Saved locally:
```

Source line 666:
```tsx
Business Health
```

Source line 667:
```tsx
Simple takeaways to help the team make better next decisions.
```

Source line 698:
```tsx
Expense Breakdown
```

Source line 699:
```tsx
See where spending is concentrated.
```

Source line 702:
```tsx
category
```

Source line 711:
```tsx
No expense data yet
```

Source line 712:
```tsx
Once expenses are added, this section will show category-wise spending.
```

## Styles

Source line 106:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

# DashboardScreen.tsx

Source: `mobile-app/src/screens/DashboardScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 34:
```tsx
hasFeature("analytics")
```

Source line 36:
```tsx
useQuery({ queryKey: ["equipment", "dashboard"], queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }) })
```

Source line 36:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 37:
```tsx
useQuery({ queryKey: ["customers", "dashboard"], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 37:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 38:
```tsx
useQuery({ queryKey: ["rentals-active", "dashboard"], queryFn: () => rentalApi.active({ page: 1, page_size: 200 }) })
```

Source line 38:
```tsx
rentalApi.active({ page: 1, page_size: 200 })
```

Source line 39:
```tsx
useQuery({ queryKey: ["rentals-history", "dashboard"], queryFn: () => rentalApi.history({ page: 1, page_size: 200 }) })
```

Source line 39:
```tsx
rentalApi.history({ page: 1, page_size: 200 })
```

Source line 40:
```tsx
useQuery({ queryKey: ["equipment-sales", "dashboard"], queryFn: () => equipmentApi.sales({ page: 1, page_size: 200 }) })
```

Source line 40:
```tsx
equipmentApi.sales({ page: 1, page_size: 200 })
```

Source line 41:
```tsx
useQuery({ queryKey: ["categories"], queryFn: categoryApi.list })
```

Source line 181:
```tsx
navigation.navigate("MainTabs", { screen: "Inventory" })
```

Source line 190:
```tsx
navigation.navigate("MainTabs", { screen: "Damaged" })
```

Source line 197:
```tsx
navigation.navigate("Reports")
```

Source line 202:
```tsx
navigation.navigate("Master")
```

Source line 222:
```tsx
navigation.navigate("MainTabs", { screen: "Rentals" })
```

Source line 232:
```tsx
navigation.navigate("MainTabs", { screen: "Rentals" })
```

Source line 242:
```tsx
navigation.navigate("MainTabs", { screen: "Inventory" })
```

Source line 252:
```tsx
navigation.navigate("MainTabs", { screen: "Customers" })
```

Source line 262:
```tsx
navigation.navigate("Master")
```

Source line 272:
```tsx
navigation.navigate("MainTabs", { screen: "Inventory" })
```

Source line 288:
```tsx
navigation.navigate("CustomerDetail", { customerId })
```

Source line 352:
```tsx
navigation.navigate("CustomerDetail", { customerId: item.customer_id })
```

## Form controls and modal declarations

Source line 197:
```tsx
<Pressable style={styles.primaryAction} onPress={() => navigation.navigate("Reports")} accessibilityRole="button" accessibilityLabel="Open Reports">
```

Source line 202:
```tsx
<Pressable style={styles.secondaryAction} onPress={() => navigation.navigate("Master")} accessibilityRole="button" accessibilityLabel="Manage Categories">
```

Source line 206:
```tsx
<Pressable style={styles.secondaryAction} onPress={() => scrollRef.current?.scrollTo({ y: alertsY.current, animated: true })} accessibilityRole="button" accessibilityLabel="View Alerts">
```

Source line 285:
```tsx
<Pressable
                key={customerId}
                style={styles.overdueCustomerRow}
                onPress={() => navigation.navigate("CustomerDetail", { customerId })}
                accessibilityRole="button"
              >
```

Source line 349:
```tsx
<Pressable
                  key={item.id}
                  style={[styles.alertRow, item.overdue && styles.alertRowDanger]}
                  onPress={() => navigation.navigate("CustomerDetail", { customerId: item.customer_id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.overdue ? "Overdue" : "Due soon"}: ${equipmentItem?.name || `Item #${item.equipment_id}`}, customer ${customer?.name || `#${item.customer_id}`}, due ${item.expected.toLocaleDateString()}, ${item.overdue ? `${Math.abs(item.diffDays)} day${Math.abs(item.diffDays) === 1 ? "" : "s"} overdue` : `${item.diffDays} day${item.diffDays === 1 ? "" : "s"} left`}`}
                >
```

Source line 424:
```tsx
<Pressable
      style={[styles.miniPill, { backgroundColor: soft }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
    >
```

Source line 459:
```tsx
<Pressable style={styles.overviewCard} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined}>
```

## Conditional behavior

Source line 87:
```tsx
if (!item.expected_return_date) return null;
```

Source line 89:
```tsx
if (Number.isNaN(expected.getTime())) return null;
```

Source line 93:
```tsx
if (!overdue && !dueSoon) return null;
```

Source line 106:
```tsx
if (left!.overdue !== right!.overdue) return left!.overdue ? -1 : 1;
```

Source line 130:
```tsx
if (route.params?.scrollToAlerts && alertsY.current) {
      scrollRef.current?.scrollTo({ y: alertsY.current, animated: true });
    }
```

## Visible text

Source line 141:
```tsx
System Dashboard
```

Source line 142:
```tsx
A clear view of rentals, stock health, and what needs follow-up today.
```

Source line 153:
```tsx
Active rentals
```

Source line 199:
```tsx
Open Reports
```

Source line 204:
```tsx
Manage Categories
```

Source line 208:
```tsx
View Alerts
```

Source line 280:
```tsx
Top Overdue Customers
```

Source line 281:
```tsx
Follow up with these customers first.
```

Source line 296:
```tsx
overdue item
```

Source line 307:
```tsx
Operations Snapshot
```

Source line 308:
```tsx
Useful live numbers for team coordination and stock planning.
```

Source line 327:
```tsx
Rental Alerts
```

Source line 328:
```tsx
Priority follow-up for overdue and near-due rentals.
```

Source line 331:
```tsx
alert
```

Source line 340:
```tsx
No active rental alerts
```

Source line 341:
```tsx
Expected return dates look healthy right now.
```

Source line 374:
```tsx
Customer:
```

Source line 375:
```tsx
Qty
```

Source line 375:
```tsx
| Due
```

Source line 391:
```tsx
Quick planning tip
```

## Styles

Source line 28:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

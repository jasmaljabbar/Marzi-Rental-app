# InvoiceListScreen.tsx

Source: `mobile-app/src/screens/InvoiceListScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 32:
```tsx
useState("")
```

Source line 33:
```tsx
useState<string | undefined>(undefined)
```

Source line 35:
```tsx
useQuery({
    queryKey: ["invoices", search, statusFilter],
    queryFn: () =>
      invoiceApi.list({ page: 1, page_size: 200, search: search || undefined, payment_status: statusFilter }),
  })
```

Source line 38:
```tsx
invoiceApi.list({ page: 1, page_size: 200, search: search || undefined, payment_status: statusFilter })
```

Source line 84:
```tsx
navigation.navigate("Invoice", { rentalId: item.rental_id })
```

## Form controls and modal declarations

Source line 55:
```tsx
<Pressable
              key={filter.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
              accessibilityRole="button"
            >
```

Source line 105:
```tsx
<Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
```

## Conditional behavior

## Visible text

Source line 109:
```tsx
·
```

## Styles

Source line 30:
```tsx
styles = createStyles(c)
```

# InvoiceScreen.tsx

Source: `mobile-app/src/screens/InvoiceScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 22:
```tsx
useQuery({
    queryKey: ["invoice", rentalId],
    queryFn: () => invoiceApi.getDetail(rentalId),
    enabled: !!rentalId,
  })
```

Source line 24:
```tsx
invoiceApi.getDetail(rentalId)
```

## Form controls and modal declarations

## Conditional behavior

Source line 28:
```tsx
if (invoiceQuery.isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <ActivityIndicator size="large" color={c.primary} />
      </SafeAreaView>
    );
  }
```

Source line 36:
```tsx
if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "bottom", "left", "right"]}>
        <MaterialCommunityIcons name="file-alert-outline" size={40} color={c.textMuted} />
        <Text style={styles.errorText}>
          {(invoiceQuery.error as any)?.message ||
            "Invoice isn't available yet — it appears once this rental is completed."}
        </Text>
      </SafeAreaView>
    );
  }
```

## Visible text

## Styles

Source line 18:
```tsx
styles = createStyles(c)
```

# AddRentalScreen.tsx

Source: `mobile-app/src/screens/AddRentalScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 17:
```tsx
useState("")
```

Source line 18:
```tsx
useState("")
```

Source line 19:
```tsx
useState("1")
```

Source line 20:
```tsx
useState("")
```

Source line 21:
```tsx
useState("0")
```

Source line 22:
```tsx
useState("")
```

Source line 31:
```tsx
useQuery({ queryKey: ["customers-add-rental"], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 31:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 32:
```tsx
useQuery({ queryKey: ["equipment-add-rental"], queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }) })
```

Source line 32:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 34:
```tsx
useMutation({
    mutationFn: () =>
      rentalApi.create({
        customer_id: customerId,
        equipment_id: equipmentId,
        quantity: Number(quantity) || 1,
        expected_return_date: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        advance_amount: Number(advanceAmount) || 0,
        remark: remark || undefined,
      }),
    onSuccess: () => {
      setCustomerId("");
      setEquipmentId("");
      setQuantity("1");
      setExpectedReturnDate("");
      setAdvanceAmount("0");
      setRemark("");
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Rental created successfully.");
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "Failed to create rental");
    },
  })
```

Source line 36:
```tsx
rentalApi.create({
        customer_id: customerId,
        equipment_id: equipmentId,
        quantity: Number(quantity) || 1,
        expected_return_date: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        advance_amount: Number(advanceAmount) || 0,
        remark: remark || undefined,
      })
```

Source line 51:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 52:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 53:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 54:
```tsx
toast.success("Rental created successfully.")
```

Source line 57:
```tsx
toast.error(err instanceof Error ? err.message : "Failed to create rental")
```

## Form controls and modal declarations

Source line 85:
```tsx
<Input
          label="Customer ID"
          value={customerId}
          onChangeText={setCustomerId}
          placeholder="e.g. 1"
          keyboardType="number-pad"
          helperText={customerHint ? `✓ ${customerHint.name} (${customerHint.phone})` : "Check Customers tab for ID"}
          leftIcon={<MaterialCommunityIcons name="account-outline" size={18} color={colors.textMuted} />}
        />
```

Source line 95:
```tsx
<Input
          label="Equipment ID"
          value={equipmentId}
          onChangeText={setEquipmentId}
          placeholder="e.g. 5"
          keyboardType="number-pad"
          helperText={equipmentHint ? `✓ ${equipmentHint.name} | Stock ${equipmentHint.stock_count}` : "Check Inventory tab for ID"}
          leftIcon={<MaterialCommunityIcons name="package-variant-outline" size={18} color={colors.textMuted} />}
        />
```

Source line 105:
```tsx
<Input
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          leftIcon={<MaterialCommunityIcons name="counter" size={18} color={colors.textMuted} />}
        />
```

Source line 113:
```tsx
<Input
          label="Expected Return Date"
          value={expectedReturnDate}
          onChangeText={setExpectedReturnDate}
          placeholder="YYYY-MM-DD"
          leftIcon={<MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textMuted} />}
        />
```

Source line 121:
```tsx
<Input
          label="Advance Amount (₹)"
          value={advanceAmount}
          onChangeText={setAdvanceAmount}
          keyboardType="decimal-pad"
          leftIcon={<MaterialCommunityIcons name="currency-inr" size={18} color={colors.textMuted} />}
        />
```

Source line 129:
```tsx
<Input
          label="Remark"
          value={remark}
          onChangeText={setRemark}
          placeholder="Optional note"
          leftIcon={<MaterialCommunityIcons name="note-text-outline" size={18} color={colors.textMuted} />}
        />
```

Source line 137:
```tsx
<Button
          variant="primary"
          size="lg"
          loading={createMutation.isPending}
          disabled={!canSubmit}
          onPress={() => createMutation.mutate()}
          leftIcon={<MaterialCommunityIcons name="plus" size={18} color={colors.textInverse} />}
          style={styles.submitBtn}
        >
```

## Conditional behavior

Source line 27:
```tsx
if (eq) setEquipmentId(String(eq));
```

Source line 28:
```tsx
if (cust) setCustomerId(String(cust));
```

## Visible text

Source line 72:
```tsx
Create Rental
```

Source line 74:
```tsx
Use customer and equipment IDs to rent items quickly.
```

## Styles

Source line 153:
```tsx
styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroText: { flex: 1, gap: spacing.xs },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
})
```

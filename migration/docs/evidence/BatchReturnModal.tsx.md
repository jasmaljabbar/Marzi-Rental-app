# BatchReturnModal.tsx

Source: `mobile-app/src/components/BatchReturnModal.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 34:
```tsx
useState("0")
```

Source line 35:
```tsx
useState("0")
```

Source line 36:
```tsx
useState("")
```

Source line 37:
```tsx
useState<string[]>([])
```

Source line 38:
```tsx
useQuery({ queryKey: ["settings", MAX_DISCOUNT_PERCENT_KEY], queryFn: () => settingsApi.get(MAX_DISCOUNT_PERCENT_KEY) })
```

Source line 38:
```tsx
settingsApi.get(MAX_DISCOUNT_PERCENT_KEY)
```

## Form controls and modal declarations

Source line 71:
```tsx
<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
```

Source line 90:
```tsx
<Pressable
                      style={styles.removeBtn}
                      onPress={() => setSelectedRentalIds((prev) => prev.filter((id) => id !== line.rental.id))}
                      disabled={isPending}
                    >
```

Source line 119:
```tsx
<TextInput
                style={[styles.input, discountExceedsCap && styles.inputError]}
                value={discount}
                onChangeText={(val) => {
                  const numeric = Number(val);
                  if (maxDiscountAmount !== null && val.trim() !== "" && !Number.isNaN(numeric) && numeric > maxDiscountAmount) {
                    setDiscount(String(maxDiscountAmount));
                  } else {
                    setDiscount(val);
                  }
                }}
                placeholder="0"
                keyboardType="decimal-pad"
              />
```

Source line 143:
```tsx
<TextInput
                style={[styles.input, paidExceedsRevenue && styles.inputError]}
                value={paidNow}
                onChangeText={(val) => {
                  const numeric = Number(val);
                  if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > revenueBeforePayment) {
                    setPaidNow(String(revenueBeforePayment));
                  } else {
                    setPaidNow(val);
                  }
                }}
                placeholder="0"
                keyboardType="decimal-pad"
              />
```

Source line 169:
```tsx
<DatePickerField
                label="Next payment reminder date (optional)"
                value={dueDate}
                onChange={setDueDate}
                placeholder="No reminder date set"
              />
```

Source line 178:
```tsx
<Pressable style={styles.outlineBtn} onPress={onClose} disabled={isPending}>
```

Source line 181:
```tsx
<Pressable
                style={[styles.primaryBtn, isPending && styles.disabledBtn]}
                onPress={() => onConfirm({ discount: Number(discount) || 0, paidNow: Number(paidNow) || 0, rentalIds: selectedRentalIds, dueDate: dueDate || undefined })}
                disabled={isPending || !selectedRentalIds.length}
              >
```

## Conditional behavior

Source line 42:
```tsx
if (visible) {
      setDiscount("0");
      setPaidNow("0");
      setDueDate("");
      setSelectedRentalIds(rentals.map((rental) => rental.id));
    }
```

Source line 124:
```tsx
if (maxDiscountAmount !== null && val.trim() !== "" && !Number.isNaN(numeric) && numeric > maxDiscountAmount) {
                    setDiscount(String(maxDiscountAmount));
                  } else {
                    setDiscount(val);
                  }
```

Source line 148:
```tsx
if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > revenueBeforePayment) {
                    setPaidNow(String(revenueBeforePayment));
                  } else {
                    setPaidNow(val);
                  }
```

## Visible text

Source line 76:
```tsx
of
```

Source line 76:
```tsx
item(s) selected for return
```

Source line 83:
```tsx
Qty
```

Source line 83:
```tsx
-
```

Source line 83:
```tsx
day(s) - Started
```

Source line 85:
```tsx
/day • Advance
```

Source line 95:
```tsx
Remove
```

Source line 102:
```tsx
No items selected.
```

Source line 109:
```tsx
Gross Total:
```

Source line 113:
```tsx
Advance Paid:
```

Source line 118:
```tsx
Discount Amount (INR)
```

Source line 134:
```tsx
Max discount:
```

Source line 134:
```tsx
% (
```

Source line 134:
```tsx
)
```

Source line 138:
```tsx
Return Revenue:
```

Source line 142:
```tsx
Amount Paid Now (INR)
```

Source line 157:
```tsx
Max:
```

Source line 160:
```tsx
Applied Payment:
```

Source line 164:
```tsx
Pending Due:
```

Source line 179:
```tsx
Cancel
```

## Styles

Source line 196:
```tsx
styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  sheetScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#1B365D" },
  meta: { color: "#5A6E86", fontSize: 13 },
  itemsBox: { borderWidth: 1, borderColor: "#E5ECF8", borderRadius: 12, overflow: "hidden" },
  itemLine: { flexDirection: "row", justifyContent: "space-between", gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: "#EFF3F9" },
  itemTitle: { color: "#1B365D", fontWeight: "800" },
  itemAmount: { color: "#111827", fontWeight: "900" },
  itemAction: { alignItems: "flex-end", gap: 8 },
  removeBtn: { borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  removeBtnText: { color: "#B91C1C", fontWeight: "800", fontSize: 12 },
  emptyLine: { padding: 12, alignItems: "center" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 6 },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  label: { color: "#475569", fontWeight: "700" },
  boldValue: { color: "#111827", fontWeight: "800" },
  field: { gap: 6 },
  input: { borderWidth: 1, borderColor: "#d6e1ee", borderRadius: 8, padding: 10, backgroundColor: "#fbfdff" },
  inputError: { borderColor: "#DC2626" },
  helperText: { color: "#5A6E86", fontSize: 11 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 12, alignItems: "center", paddingVertical: 12, backgroundColor: "#F8FAFC" },
  outlineBtnText: { fontWeight: "800", color: "#1F2937" },
  primaryBtn: { flex: 1, backgroundColor: "#5B5CE2", borderRadius: 12, alignItems: "center", paddingVertical: 12 },
  disabledBtn: { opacity: 0.65 },
  primaryBtnText: { color: "white", fontWeight: "800" },
})
```

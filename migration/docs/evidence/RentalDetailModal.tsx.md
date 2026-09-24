# RentalDetailModal.tsx

Source: `mobile-app/src/components/RentalDetailModal.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 40:
```tsx
useState(false)
```

Source line 41:
```tsx
useState<RentalDetailForm>({
    expected_return_date: "",
    quantity: "1",
    advance_amount: "0",
    remark: "",
  })
```

## Form controls and modal declarations

Source line 73:
```tsx
<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
```

Source line 84:
```tsx
<Pressable style={styles.iconBtn} onPress={onCall} accessibilityRole="button" accessibilityLabel="Call customer">
```

Source line 89:
```tsx
<Pressable style={styles.iconBtn} onPress={onViewInvoice} accessibilityRole="button" accessibilityLabel="View invoice">
```

Source line 94:
```tsx
<Pressable style={styles.outlineMiniBtn} onPress={() => setIsEditing((current) => !current)} disabled={isSaving}>
```

Source line 123:
```tsx
<TextInput
                    style={styles.input}
                    value={form.quantity}
                    onChangeText={(value) => updateField("quantity", value.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder="1"
                  />
```

Source line 133:
```tsx
<DatePickerField value={form.expected_return_date} onChange={(value) => updateField("expected_return_date", value)} placeholder="Expected return date" allowPast />
```

Source line 137:
```tsx
<TextInput
                    style={styles.input}
                    value={form.advance_amount}
                    onChangeText={(value) => updateField("advance_amount", value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
```

Source line 147:
```tsx
<TextInput
                    style={[styles.input, styles.remarkInput]}
                    value={form.remark}
                    onChangeText={(value) => updateField("remark", value)}
                    placeholder="Remark"
                    multiline
                  />
```

Source line 171:
```tsx
<Pressable style={styles.outlineBtn} onPress={onClose} disabled={isSaving}>
```

Source line 175:
```tsx
<Pressable
                  style={[styles.primaryBtn, isSaving && styles.disabledBtn]}
                  disabled={isSaving}
                  onPress={() =>
                    onSave({
                      expected_return_date: form.expected_return_date ? new Date(form.expected_return_date).toISOString() : null,
                      quantity,
                      advance_amount: Number(form.advance_amount) || 0,
                      remark: form.remark.trim() || null,
                    })
                  }
                >
```

## Conditional behavior

Source line 49:
```tsx
if (!rental) return;
```

Source line 59:
```tsx
if (!rental) return null;
```

## Visible text

Source line 79:
```tsx
Rental Details
```

Source line 80:
```tsx
#
```

Source line 105:
```tsx
Overdue since
```

Source line 122:
```tsx
Quantity
```

Source line 132:
```tsx
Expected Return Date
```

Source line 136:
```tsx
Advance Amount
```

Source line 146:
```tsx
Remark
```

Source line 164:
```tsx
Remark
```

Source line 172:
```tsx
Close
```

## Styles

Source line 207:
```tsx
styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  sheetScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  overdueBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  overdueBannerText: { color: "#B91C1C", fontWeight: "800", fontSize: 12, flexShrink: 1 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#1B365D" },
  meta: { color: "#5A6E86", fontSize: 13 },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  label: { color: "#475569", fontWeight: "700" },
  value: { color: "#1f2937", fontWeight: "700", flexShrink: 1, textAlign: "right" },
  boldValue: { color: "#111827", fontWeight: "800", flexShrink: 1, textAlign: "right" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 6 },
  field: { gap: 6 },
  input: { borderWidth: 1, borderColor: "#d6e1ee", borderRadius: 8, padding: 9, backgroundColor: "#fbfdff" },
  remarkInput: { minHeight: 72, textAlignVertical: "top" },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 12, alignItems: "center", paddingVertical: 12, backgroundColor: "#F8FAFC" },
  outlineBtnText: { fontWeight: "800", color: "#1F2937" },
  outlineMiniBtn: { borderWidth: 1.5, borderColor: "#CBD5E1", borderRadius: 10, alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#F8FAFC" },
  outlineMiniBtnText: { fontWeight: "800", color: "#1F2937" },
  primaryBtn: { flex: 1, backgroundColor: "#5B5CE2", borderRadius: 12, alignItems: "center", paddingVertical: 12, shadowColor: "#5B5CE2", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  primaryBtnText: { color: "white", fontWeight: "800" },
  disabledBtn: { opacity: 0.6 },
})
```

# ExpensesScreen.tsx

Source: `mobile-app/src/screens/ExpensesScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 71:
```tsx
useState(false)
```

Source line 72:
```tsx
useState<Expense | null>(null)
```

Source line 73:
```tsx
useState<string | null>(null)
```

Source line 74:
```tsx
useState(DEFAULT_CATEGORY)
```

Source line 75:
```tsx
useState("0")
```

Source line 76:
```tsx
useState("")
```

Source line 77:
```tsx
useState<string>("Cash")
```

Source line 78:
```tsx
useState("")
```

Source line 79:
```tsx
useState(false)
```

Source line 80:
```tsx
useState("")
```

Source line 81:
```tsx
useState("All")
```

Source line 83:
```tsx
useQuery({ queryKey: ["expenses"], queryFn: expenseApi.list })
```

Source line 113:
```tsx
toast.error("Please grant photo library access to attach a receipt.")
```

Source line 126:
```tsx
uploadApi.uploadFile(asset.uri, fileName, mimeType)
```

Source line 129:
```tsx
toast.error(error instanceof Error ? error.message : "Could not upload receipt photo.")
```

Source line 135:
```tsx
useMutation({
    mutationFn: async () => {
      const payload = {
        category: category.trim(),
        amount: Number(amount) || 0,
        remark: remark.trim(),
        payment_mode: paymentMode,
        receipt_url: receiptUrl || undefined,
      };
      if (editing) return expenseApi.update(editing.id, payload);
      return expenseApi.create(payload);
    },
    onSuccess: () => {
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : "Unable to save expense");
    },
  })
```

Source line 144:
```tsx
expenseApi.update(editing.id, payload)
```

Source line 145:
```tsx
expenseApi.create(payload)
```

Source line 150:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 153:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to save expense")
```

Source line 157:
```tsx
useMutation({
    mutationFn: expenseApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete expense");
    },
  })
```

Source line 159:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 161:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to delete expense")
```

Source line 197:
```tsx
toast.error("Please enter an expense category.")
```

Source line 201:
```tsx
toast.error("Please enter an amount greater than zero.")
```

## Form controls and modal declarations

Source line 214:
```tsx
<AddButton label="Add Expense" onPress={openCreateModal} />
```

Source line 244:
```tsx
<TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by category or remark"
            placeholderTextColor={c.textMuted}
          />
```

Source line 252:
```tsx
<Pressable onPress={() => setSearch("")} hitSlop={8}>
```

Source line 262:
```tsx
<Pressable
                key={item}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedCategoryFilter(item)}
              >
```

Source line 291:
```tsx
<Pressable style={styles.primaryCta} onPress={openCreateModal}>
```

Source line 342:
```tsx
<Pressable style={styles.secondaryAction} onPress={() => openEditModal(item)}>
```

Source line 346:
```tsx
<Pressable
                    style={styles.dangerAction}
                    onPress={() => setConfirmDeleteId(item.id)}
                  >
```

Source line 360:
```tsx
<Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
```

Source line 376:
```tsx
<TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Expense category" placeholderTextColor={c.textMuted} />
```

Source line 383:
```tsx
<Pressable key={item} style={[styles.quickChip, active && styles.quickChipActive]} onPress={() => setCategory(item)}>
```

Source line 392:
```tsx
<TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="decimal-pad" />
```

Source line 397:
```tsx
<TextInput
                style={[styles.input, styles.remarkInput]}
                value={remark}
                onChangeText={setRemark}
                placeholder="Supplier, bill number, note, or short description"
                placeholderTextColor={c.textMuted}
                multiline
              />
```

Source line 413:
```tsx
<Pressable key={mode} style={[styles.quickChip, active && styles.quickChipActive]} onPress={() => setPaymentMode(mode)}>
```

Source line 431:
```tsx
<Pressable style={styles.receiptRemoveBtn} onPress={() => setReceiptUrl("")}>
```

Source line 437:
```tsx
<Pressable style={styles.receiptUploadBtn} onPress={pickReceiptPhoto} disabled={uploadingReceipt}>
```

Source line 451:
```tsx
<Pressable
                style={[styles.modalSecondaryBtn, styles.modalActionBtn]}
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
```

Source line 460:
```tsx
<Pressable style={[styles.modalPrimaryBtn, styles.modalActionBtn]} onPress={handleSave} disabled={saveMutation.isPending}>
```

## Conditional behavior

Source line 47:
```tsx
if (normalized.includes("salary")) return palette.salary;
```

Source line 48:
```tsx
if (normalized.includes("repair")) return palette.repair;
```

Source line 49:
```tsx
if (normalized.includes("stock") || normalized.includes("purchase") || normalized.includes("equipment")) return palette.stock;
```

Source line 50:
```tsx
if (normalized.includes("transport")) return palette.transport;
```

Source line 51:
```tsx
if (normalized.includes("office")) return palette.office;
```

Source line 52:
```tsx
if (normalized.includes("maintenance")) return palette.maintenance;
```

Source line 58:
```tsx
if (!dateString) return false;
```

Source line 60:
```tsx
if (Number.isNaN(date.getTime())) return false;
```

Source line 112:
```tsx
if (!permission.granted) {
        toast.error("Please grant photo library access to attach a receipt.");
        return;
      }
```

Source line 121:
```tsx
if (result.canceled || !result.assets?.length) return;
```

Source line 144:
```tsx
if (editing) return expenseApi.update(editing.id, payload);
```

Source line 170:
```tsx
if (item.category?.trim()) {
        unique.add(item.category.trim());
      }
```

Source line 196:
```tsx
if (!category.trim()) {
      toast.error("Please enter an expense category.");
      return;
    }
```

Source line 200:
```tsx
if ((Number(amount) || 0) <= 0) {
      toast.error("Please enter an amount greater than zero.");
      return;
    }
```

Source line 478:
```tsx
if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
```

## Visible text

Source line 211:
```tsx
Expense Management
```

Source line 212:
```tsx
Track spending, review recent entries, and add expenses faster.
```

Source line 221:
```tsx
Expense overview
```

Source line 223:
```tsx
record
```

Source line 226:
```tsx
Total spent across all logged expenses
```

Source line 230:
```tsx
This month
```

Source line 234:
```tsx
Highest entry
```

Source line 275:
```tsx
Recent Expenses
```

Source line 276:
```tsx
shown
```

Source line 292:
```tsx
Add First Expense
```

Source line 315:
```tsx
Remark
```

Source line 344:
```tsx
Edit
```

Source line 351:
```tsx
Delete
```

Source line 367:
```tsx
Capture the category, amount, and a short note for easier tracking.
```

Source line 375:
```tsx
Category
```

Source line 391:
```tsx
Amount (INR)
```

Source line 396:
```tsx
Remark
```

Source line 408:
```tsx
Payment Mode
```

Source line 422:
```tsx
Receipt Photo (optional)
```

Source line 433:
```tsx
Remove
```

Source line 445:
```tsx
Preview
```

Source line 458:
```tsx
Close
```

## Styles

Source line 67:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

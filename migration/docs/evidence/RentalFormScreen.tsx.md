# RentalFormScreen.tsx

Source: `mobile-app/src/screens/RentalFormScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 61:
```tsx
useState("")
```

Source line 62:
```tsx
useState(false)
```

Source line 63:
```tsx
useState("")
```

Source line 64:
```tsx
useState("")
```

Source line 65:
```tsx
useState(false)
```

Source line 66:
```tsx
useState(false)
```

Source line 67:
```tsx
useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  })
```

Source line 72:
```tsx
useState<Record<number, string>>(
    () => Object.fromEntries(items.map((item) => [item.id, String(item.quantity || 1)])),
  )
```

Source line 75:
```tsx
useState<{
    visible: boolean;
    itemId: string;
    equipmentName: string;
    message: string;
    conflict: ReservationConflict | null;
  }>({ visible: false, itemId: "", equipmentName: "", message: "", conflict: null })
```

Source line 112:
```tsx
useMutation({
    mutationFn: (payload: {
      customer_id: string;
      items: Array<{ equipment_id: string; quantity: number }>;
      expected_return_date?: string;
      advance_amount?: number;
      remark?: string;
    }) => {
      console.log("rental payload", payload);
      return rentalApi.createBulk(payload);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      // The draft is now a real, stock-deducting rental — release the
      // provisional hold so it stops counting against other customers' drafts.
      try {
        await reservationApi.clearForCustomer(customer.id);
        queryClient.invalidateQueries({ queryKey: ["reservations"] });
      } catch {
        // Best-effort — a leftover hold just expires via TTL in the worst case.
      }
      setSuccessFlag(true);
      setExpectedReturnDate("");
      setAdvanceAmount("");
      setRemark("");
      setHasFreeAddOn(false);
      setQuantities(() => Object.fromEntries(items.map((item) => [item.id, "1"])));
      const resetToken = Date.now();
      // send reset to Home, then open customer detail
      navigation.navigate("MainTabs" as never, { screen: "Home", params: { resetToken } } as never);
      setTimeout(() => {
        navigation.navigate("CustomerDetail" as never, { customerId: customer.id } as never);
      }, 50);
    },
    onError: (err: any) => {
      console.error("rental create error", err);
      const message = (err instanceof Error && err.message) || "Could not create rental. Please try again.";
      toast.error(message);
    },
  })
```

Source line 121:
```tsx
rentalApi.createBulk(payload)
```

Source line 124:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 125:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 126:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 130:
```tsx
reservationApi.clearForCustomer(customer.id)
```

Source line 131:
```tsx
queryClient.invalidateQueries({ queryKey: ["reservations"] })
```

Source line 143:
```tsx
navigation.navigate("MainTabs" as never, { screen: "Home", params: { resetToken } } as never)
```

Source line 145:
```tsx
navigation.navigate("CustomerDetail" as never, { customerId: customer.id } as never)
```

Source line 151:
```tsx
toast.error(message)
```

Source line 158:
```tsx
useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      reservationApi.upsert(customer.id, itemId, quantity),
    onSuccess: (_data, variables) => {
      lastSyncedQuantities.current[variables.itemId] = variables.quantity;
    },
    onError: (err: any, variables) => {
      const conflictErr = err as ReservationConflictError;
      const item = items.find((i) => i.id === variables.itemId);
      const revertTo = lastSyncedQuantities.current[variables.itemId] || 1;
      setQuantities((s) => ({ ...s, [variables.itemId]: String(revertTo) }));
      if (conflictErr?.status === 409) {
        setConflictModal({
          visible: true,
          itemId: variables.itemId,
          equipmentName: item?.name || "This item",
          message: conflictErr.message,
          conflict: conflictErr.conflict || null,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Could not update the reserved quantity.");
      }
    },
  })
```

Source line 160:
```tsx
reservationApi.upsert(customer.id, itemId, quantity)
```

Source line 178:
```tsx
toast.error(err instanceof Error ? err.message : "Could not update the reserved quantity.")
```

Source line 183:
```tsx
useMutation({
    mutationFn: ({ reservationId }: { reservationId: string }) => reservationApi.transfer(reservationId, customer.id),
    onSuccess: (data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      lastSyncedQuantities.current[data.equipment_id] = data.quantity;
      setQuantities((s) => ({ ...s, [data.equipment_id]: String(data.quantity) }));
      setConflictModal({ visible: false, itemId: "", equipmentName: "", message: "", conflict: null });
      toast.success("Item transferred to this order.");
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not transfer this reservation."),
  })
```

Source line 184:
```tsx
reservationApi.transfer(reservationId, customer.id)
```

Source line 186:
```tsx
queryClient.invalidateQueries({ queryKey: ["reservations"] })
```

Source line 190:
```tsx
toast.success("Item transferred to this order.")
```

Source line 192:
```tsx
toast.error(err instanceof Error ? err.message : "Could not transfer this reservation.")
```

Source line 197:
```tsx
toast.error("Use YYYY-MM-DD for expected return date.")
```

Source line 202:
```tsx
toast.error("Select at least one item to rent.")
```

Source line 207:
```tsx
toast.error(`Insufficient stock for ${overStock.name}. Available: ${overStock.stock_count}.`)
```

Source line 211:
```tsx
toast.error(`Advance payment cannot exceed the total rent of ₹${totalRent.toLocaleString()}.`)
```

## Form controls and modal declarations

Source line 271:
```tsx
<TextInput
                style={styles.qtyInput}
                keyboardType="number-pad"
                value={quantities[item.id]}
                onChangeText={(val) => setQuantities((s) => ({ ...s, [item.id]: val }))}
                onBlur={() => {
                  const quantity = Number(quantities[item.id]) || 1;
                  if (quantity === lastSyncedQuantities.current[item.id]) return;
                  syncQuantityMutation.mutate({ itemId: item.id, quantity });
                }}
              />
```

Source line 290:
```tsx
<Pressable style={styles.dateField} onPress={() => setShowDateModal(true)}>
```

Source line 296:
```tsx
<Pressable
              onPress={() => setExpectedReturnDate("")}
              hitSlop={8}
              style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            >
```

Source line 317:
```tsx
<TextInput
          style={[styles.input, advanceExceedsTotal && styles.inputError]}
          placeholder="Optional advance (e.g. 500)"
          placeholderTextColor={c.textMuted}
          value={advanceAmount}
          onChangeText={(val) => {
            const numeric = Number(val);
            if (val.trim() !== "" && !Number.isNaN(numeric) && totalRent > 0 && numeric > totalRent) {
              setAdvanceAmount(String(totalRent));
            } else {
              setAdvanceAmount(val);
            }
          }}
          keyboardType="decimal-pad"
        />
```

Source line 338:
```tsx
<Pressable style={styles.checkboxRow} onPress={() => setHasFreeAddOn((v) => !v)}>
```

Source line 346:
```tsx
<TextInput
          style={[styles.input, { minHeight: 70 }]}
          placeholder="Optional notes for this rental"
          placeholderTextColor={c.textMuted}
          value={remark}
          onChangeText={setRemark}
          multiline
        />
```

Source line 356:
```tsx
<Pressable
        style={[styles.submitBtn, (createMutation.isPending || !canSubmit) && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={createMutation.isPending || !canSubmit}
      >
```

Source line 374:
```tsx
<Modal visible={showDateModal} transparent animationType="fade" onRequestClose={() => setShowDateModal(false)}>
```

Source line 378:
```tsx
<TouchableOpacity onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} hitSlop={12}>
```

Source line 384:
```tsx
<TouchableOpacity onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} hitSlop={12}>
```

Source line 403:
```tsx
<TouchableOpacity
                    key={day.key}
                    style={[styles.dayCell, selected && styles.dayCellSelected, disabled && styles.dayCellDisabled, outside && styles.dayCellOutside]}
                    disabled={disabled}
                    onPress={() => {
                      setExpectedReturnDate(day.iso);
                      setShowDateModal(false);
                    }}
                  >
```

Source line 428:
```tsx
<Pressable style={[styles.confirmBtnBase, styles.todayBtn]} onPress={selectToday}>
```

Source line 431:
```tsx
<Pressable style={[styles.confirmBtnBase, styles.confirmCancel]} onPress={() => setShowDateModal(false)}>
```

Source line 439:
```tsx
<ReservationConflictModal
        visible={conflictModal.visible}
        equipmentName={conflictModal.equipmentName}
        targetCustomerName={customer.name}
        message={conflictModal.message}
        conflict={conflictModal.conflict}
        loading={transferReservationMutation.isPending}
        onCancel={() => setConflictModal({ visible: false, itemId: "", equipmentName: "", message: "", conflict: null })}
        onTransfer={() => {
          if (!conflictModal.conflict) return;
          transferReservationMutation.mutate({ reservationId: conflictModal.conflict.reservation_id });
        }}
      />
```

## Conditional behavior

Source line 95:
```tsx
if (!expectedReturnDate) return 1;
```

Source line 169:
```tsx
if (conflictErr?.status === 409) {
        setConflictModal({
          visible: true,
          itemId: variables.itemId,
          equipmentName: item?.name || "This item",
          message: conflictErr.message,
          conflict: conflictErr.conflict || null,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Could not update the reserved quantity.");
      }
```

Source line 196:
```tsx
if (expectedReturnDate.trim() && Number.isNaN(Date.parse(expectedReturnDate))) {
      toast.error("Use YYYY-MM-DD for expected return date.");
      return;
    }
```

Source line 201:
```tsx
if (!sanitized.length) {
      toast.error("Select at least one item to rent.");
      return;
    }
```

Source line 206:
```tsx
if (overStock) {
      toast.error(`Insufficient stock for ${overStock.name}. Available: ${overStock.stock_count}.`);
      return;
    }
```

Source line 210:
```tsx
if (totalRent > 0 && (Number(advanceAmount) || 0) > totalRent) {
      toast.error(`Advance payment cannot exceed the total rent of ₹${totalRent.toLocaleString()}.`);
      return;
    }
```

Source line 278:
```tsx
if (quantity === lastSyncedQuantities.current[item.id]) return;
```

Source line 324:
```tsx
if (val.trim() !== "" && !Number.isNaN(numeric) && totalRent > 0 && numeric > totalRent) {
              setAdvanceAmount(String(totalRent));
            } else {
              setAdvanceAmount(val);
            }
```

Source line 448:
```tsx
if (!conflictModal.conflict) return;
```

## Visible text

Source line 238:
```tsx
Rental confirmed
```

Source line 262:
```tsx
Items selected
```

Source line 267:
```tsx
₹
```

Source line 267:
```tsx
/ day • In stock
```

Source line 270:
```tsx
Qty
```

Source line 288:
```tsx
Schedule & notes
```

Source line 289:
```tsx
Expected return date
```

Source line 307:
```tsx
Total rent
```

Source line 309:
```tsx
₹
```

Source line 311:
```tsx
₹
```

Source line 311:
```tsx
/ day ×
```

Source line 311:
```tsx
day
```

Source line 316:
```tsx
Advance payment
```

Source line 334:
```tsx
Max advance: ₹
```

Source line 342:
```tsx
Customer took free add-on / accessory items
```

Source line 345:
```tsx
Remarks
```

Source line 429:
```tsx
Today
```

Source line 432:
```tsx
Close
```

## Styles

Source line 54:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

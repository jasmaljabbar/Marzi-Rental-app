# EquipmentDetailScreen.tsx

Source: `mobile-app/src/screens/EquipmentDetailScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 29:
```tsx
hasFeature("maintenance")
```

Source line 30:
```tsx
hasFeature("paymentQrCode")
```

Source line 32:
```tsx
useState(false)
```

Source line 33:
```tsx
useState(false)
```

Source line 34:
```tsx
useState(false)
```

Source line 36:
```tsx
useState("1")
```

Source line 37:
```tsx
useState("0")
```

Source line 38:
```tsx
useState("")
```

Source line 39:
```tsx
useState(false)
```

Source line 40:
```tsx
useState<string | null>(null)
```

Source line 41:
```tsx
useState("0")
```

Source line 42:
```tsx
useState("0")
```

Source line 43:
```tsx
useState(false)
```

Source line 44:
```tsx
useState(false)
```

Source line 45:
```tsx
useState(false)
```

Source line 46:
```tsx
useState(false)
```

Source line 47:
```tsx
useState(false)
```

Source line 48:
```tsx
useState("")
```

Source line 49:
```tsx
useState("")
```

Source line 50:
```tsx
useState("0")
```

Source line 51:
```tsx
useState("1")
```

Source line 52:
```tsx
useState("")
```

Source line 53:
```tsx
useState("")
```

Source line 54:
```tsx
useState("")
```

Source line 55:
```tsx
useState(false)
```

Source line 56:
```tsx
useState("1")
```

Source line 57:
```tsx
useState("0")
```

Source line 58:
```tsx
useState("0")
```

Source line 59:
```tsx
useState("")
```

Source line 61:
```tsx
useQuery({ queryKey: ["equipment", "detail", equipmentId], queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }) })
```

Source line 61:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 62:
```tsx
useQuery({ queryKey: ["rentals-active", "equipment", equipmentId], queryFn: () => rentalApi.active({ page: 1, page_size: 200 }) })
```

Source line 62:
```tsx
rentalApi.active({ page: 1, page_size: 200 })
```

Source line 63:
```tsx
useQuery({ queryKey: ["rentals-history", "equipment", equipmentId], queryFn: () => rentalApi.history({ page: 1, page_size: 200, include_cancelled: true }) })
```

Source line 63:
```tsx
rentalApi.history({ page: 1, page_size: 200, include_cancelled: true })
```

Source line 64:
```tsx
useQuery({ queryKey: ["customers", "equipment-detail"], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 64:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 65:
```tsx
useQuery({ queryKey: ["settings"], queryFn: settingsApi.list })
```

Source line 69:
```tsx
useMutation({
    mutationFn: () => equipmentApi.addStock(equipmentId, Number(qty) || 0, Number(unitPrice) || 0, note),
    onSuccess: () => {
      setShowStockModal(false);
      setQty("1");
      setUnitPrice("0");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  })
```

Source line 70:
```tsx
equipmentApi.addStock(equipmentId, Number(qty) || 0, Number(unitPrice) || 0, note)
```

Source line 76:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 77:
```tsx
queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
```

Source line 78:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 82:
```tsx
useMutation({
    mutationFn: (payload: { action: "Damage" | "Repair"; remark: string; cost: number }) => equipmentApi.maintenance(equipmentId, payload.action, payload.remark, payload.cost),
    onSuccess: () => {
      setShowDamageModal(false);
      setShowRepairModal(false);
      setDamageRemark("");
      setRepairRemark("");
      setRepairCost("0");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  })
```

Source line 83:
```tsx
equipmentApi.maintenance(equipmentId, payload.action, payload.remark, payload.cost)
```

Source line 90:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 91:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 95:
```tsx
useMutation({
    mutationFn: () => equipmentApi.scrap(equipmentId, Number(scrapQty) || 0, scrapRemark.trim() || "Marked as scrap"),
    onSuccess: () => {
      setShowScrapModal(false);
      setScrapQty("1");
      setScrapRemark("");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not mark equipment as scrap"),
  })
```

Source line 96:
```tsx
equipmentApi.scrap(equipmentId, Number(scrapQty) || 0, scrapRemark.trim() || "Marked as scrap")
```

Source line 101:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 102:
```tsx
queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
```

Source line 103:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 105:
```tsx
toast.error(err instanceof Error ? err.message : "Could not mark equipment as scrap")
```

Source line 108:
```tsx
useMutation({
    mutationFn: () =>
      equipmentApi.sell(equipmentId, {
        customer_id: saleCustomerId,
        quantity: Number(saleQty) || 0,
        selling_price: Number(salePrice) || 0,
        amount_paid: Number(salePaid) || 0,
        remark: saleRemark.trim() || undefined,
      }),
    onSuccess: () => {
      setShowSellModal(false);
      setSaleCustomerId("");
      setSaleCustomerSearch("");
      setShowSaleCustomerOptions(false);
      setSaleQty("1");
      setSalePrice("0");
      setSalePaid("0");
      setSaleRemark("");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-sales"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not record sale"),
  })
```

Source line 110:
```tsx
equipmentApi.sell(equipmentId, {
        customer_id: saleCustomerId,
        quantity: Number(saleQty) || 0,
        selling_price: Number(salePrice) || 0,
        amount_paid: Number(salePaid) || 0,
        remark: saleRemark.trim() || undefined,
      })
```

Source line 126:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 127:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment-sales"] })
```

Source line 128:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 129:
```tsx
queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
```

Source line 131:
```tsx
toast.error(err instanceof Error ? err.message : "Could not record sale")
```

Source line 134:
```tsx
useMutation({
    mutationFn: (payload: any) => equipmentApi.update(equipmentId, payload),
    onSuccess: () => {
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "Could not update equipment");
    },
  })
```

Source line 135:
```tsx
equipmentApi.update(equipmentId, payload)
```

Source line 138:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 141:
```tsx
toast.error(err instanceof Error ? err.message : "Could not update equipment")
```

Source line 145:
```tsx
useMutation({
    mutationFn: () => equipmentApi.remove(equipmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      navigation.goBack();
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not delete equipment"),
  })
```

Source line 146:
```tsx
equipmentApi.remove(equipmentId)
```

Source line 148:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 149:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 150:
```tsx
queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
```

Source line 151:
```tsx
navigation.goBack()
```

Source line 153:
```tsx
toast.error(err instanceof Error ? err.message : "Could not delete equipment")
```

Source line 171:
```tsx
useMutation({
    mutationFn: ({ id, discount, paidNow }: { id: string; discount: number; paidNow: number }) => rentalApi.complete(id, discount, paidNow),
    onSuccess: () => {
      setShowComplete(false);
      setTargetRentalId(null);
      setReturnDiscount("0");
      setReturnPaidNow("0");
      if (canShowPaymentQr) setShowQr(true);
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not complete the return."),
  })
```

Source line 172:
```tsx
rentalApi.complete(id, discount, paidNow)
```

Source line 179:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 180:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 181:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 183:
```tsx
toast.error(err instanceof Error ? err.message : "Could not complete the return.")
```

Source line 233:
```tsx
navigation.navigate("MainTabs", { screen: "Home", params: { focusEquipmentName: safeEquipment.name } })
```

Source line 456:
```tsx
toast.error("Enter a valid scrap quantity")
```

Source line 568:
```tsx
toast.error("Select a customer for this sale")
```

Source line 572:
```tsx
toast.error("Enter a valid sale quantity")
```

## Form controls and modal declarations

Source line 212:
```tsx
<Pressable style={styles.iconBtn} onPress={() => setShowEditModal(true)} accessibilityRole="button" accessibilityLabel="Edit equipment" hitSlop={8}>
```

Source line 215:
```tsx
<Pressable style={styles.iconBtn} onPress={() => setShowDeleteConfirm(true)} accessibilityRole="button" accessibilityLabel="Delete equipment" hitSlop={8}>
```

Source line 230:
```tsx
<Pressable
            style={[styles.rentCta, availableStock(safeEquipment) <= 0 && styles.rentCtaDisabled]}
            disabled={availableStock(safeEquipment) <= 0}
            onPress={() => navigation.navigate("MainTabs", { screen: "Home", params: { focusEquipmentName: safeEquipment.name } })}
            accessibilityRole="button"
            accessibilityLabel={availableStock(safeEquipment) <= 0 ? "Out of stock" : `Rent ${safeEquipment.name}`}
          >
```

Source line 249:
```tsx
<Pressable style={[styles.actionBtn, styles.actionStock]} onPress={() => setShowStockModal(true)}>
```

Source line 253:
```tsx
<Pressable style={[styles.actionBtn, styles.actionInfo]} disabled={isLoading} onPress={() => setShowSellModal(true)}>
```

Source line 258:
```tsx
<Pressable style={[styles.actionBtn, styles.actionInfo]} onPress={() => setShowRepairModal(true)}>
```

Source line 264:
```tsx
<Pressable style={[styles.actionBtn, styles.actionWarn]} onPress={() => setShowDamageModal(true)}>
```

Source line 269:
```tsx
<Pressable style={[styles.actionBtn, styles.actionDanger]} disabled={isLoading} onPress={() => setShowScrapModal(true)}>
```

Source line 310:
```tsx
<Pressable
                  style={styles.returnBtn}
                  onPress={() => {
                    setTargetRentalId(item.id);
                    setShowComplete(true);
                  }}
                >
```

Source line 396:
```tsx
<Modal visible={showStockModal} animationType="slide" onRequestClose={() => setShowStockModal(false)}>
```

Source line 402:
```tsx
<TextInput style={styles.input} placeholder="1" keyboardType="number-pad" value={qty} onChangeText={setQty} />
```

Source line 406:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={unitPrice} onChangeText={setUnitPrice} />
```

Source line 410:
```tsx
<TextInput style={styles.input} placeholder="Supplier/bill note" value={note} onChangeText={setNote} />
```

Source line 420:
```tsx
<Pressable style={[styles.outlineBtn, styles.actionBtn]} onPress={() => setShowStockModal(false)}>
```

Source line 423:
```tsx
<Pressable style={[styles.primaryBtn, styles.actionBtn]} onPress={() => addStockMutation.mutate()}>
```

Source line 430:
```tsx
<Modal visible={showScrapModal} animationType="slide" onRequestClose={() => setShowScrapModal(false)}>
```

Source line 437:
```tsx
<TextInput style={styles.input} placeholder="1" keyboardType="number-pad" value={scrapQty} onChangeText={setScrapQty} />
```

Source line 441:
```tsx
<TextInput style={styles.input} placeholder="Reason for scrapping" value={scrapRemark} onChangeText={setScrapRemark} />
```

Source line 449:
```tsx
<Pressable style={[styles.outlineBtn, styles.actionBtn]} onPress={() => setShowScrapModal(false)}>
```

Source line 452:
```tsx
<Pressable
                style={[styles.primaryBtn, styles.actionBtn]}
                onPress={() => {
                  if ((Number(scrapQty) || 0) <= 0) {
                    toast.error("Enter a valid scrap quantity");
                    return;
                  }
                  scrapMutation.mutate();
                }}
              >
```

Source line 469:
```tsx
<Modal visible={showSellModal} animationType="slide" onRequestClose={() => setShowSellModal(false)}>
```

Source line 477:
```tsx
<Pressable
                  style={styles.selectField}
                  onPress={() => {
                    setSaleCustomerSearch("");
                    setShowSaleCustomerOptions(true);
                  }}
                >
```

Source line 491:
```tsx
<Modal
                visible={showSaleCustomerOptions}
                animationType="fade"
                transparent
                onRequestClose={() => setShowSaleCustomerOptions(false)}
              >
```

Source line 497:
```tsx
<Pressable style={styles.customerModalBackdrop} onPress={() => setShowSaleCustomerOptions(false)}>
```

Source line 498:
```tsx
<Pressable style={styles.customerModalCard} onPress={() => {}}>
```

Source line 500:
```tsx
<TextInput
                      style={styles.input}
                      placeholder="Search customer by name or phone"
                      value={saleCustomerSearch}
                      autoFocus
                      onChangeText={setSaleCustomerSearch}
                    />
```

Source line 512:
```tsx
<Pressable
                              key={customer.id}
                              style={[styles.customerOption, selected && styles.customerOptionSelected]}
                              onPress={() => {
                                setSaleCustomerId(customer.id);
                                setShowSaleCustomerOptions(false);
                              }}
                            >
```

Source line 529:
```tsx
<Pressable style={[styles.outlineBtn, styles.actionBtn]} onPress={() => setShowSaleCustomerOptions(false)}>
```

Source line 538:
```tsx
<TextInput style={styles.input} placeholder="1" keyboardType="number-pad" value={saleQty} onChangeText={setSaleQty} />
```

Source line 542:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={salePrice} onChangeText={setSalePrice} />
```

Source line 547:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={salePaid} onChangeText={setSalePaid} />
```

Source line 551:
```tsx
<TextInput style={styles.input} placeholder="Optional sale note" value={saleRemark} onChangeText={setSaleRemark} />
```

Source line 561:
```tsx
<Pressable style={[styles.outlineBtn, styles.actionBtn]} onPress={() => setShowSellModal(false)}>
```

Source line 564:
```tsx
<Pressable
                  style={[styles.primaryBtn, styles.actionBtn]}
                  onPress={() => {
                    if (!saleCustomerId) {
                      toast.error("Select a customer for this sale");
                      return;
                    }
                    if ((Number(saleQty) || 0) <= 0) {
                      toast.error("Enter a valid sale quantity");
                      return;
                    }
                    sellMutation.mutate();
                  }}
                >
```

Source line 586:
```tsx
<Modal visible={showEditModal} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
```

Source line 589:
```tsx
<EquipmentForm
              title="Edit Equipment"
              initialValue={safeEquipment}
              showStockField={false}
              submitLabel="Save Changes"
              submittingLabel="Saving..."
              isSubmitting={editMutation.isPending}
              onSubmit={(payload) => editMutation.mutateAsync(payload)}
              onCancel={() => setShowEditModal(false)}
            />
```

Source line 604:
```tsx
<Modal visible={showDamageModal} animationType="slide" onRequestClose={() => setShowDamageModal(false)}>
```

Source line 611:
```tsx
<TextInput style={styles.input} placeholder="Describe the damage" value={damageRemark} onChangeText={setDamageRemark} />
```

Source line 614:
```tsx
<Pressable style={[styles.outlineBtn, styles.actionBtn]} onPress={() => setShowDamageModal(false)}>
```

Source line 617:
```tsx
<Pressable
                style={[styles.primaryBtn, styles.actionBtn]}
                onPress={() =>
                  maintenanceMutation.mutate({
                    action: "Damage",
                    remark: damageRemark.trim() || "Marked as damaged",
                    cost: 0,
                  })
                }
              >
```

Source line 634:
```tsx
<Modal visible={showRepairModal} animationType="slide" onRequestClose={() => setShowRepairModal(false)}>
```

Source line 641:
```tsx
<TextInput style={styles.input} placeholder="Repair details" value={repairRemark} onChangeText={setRepairRemark} />
```

Source line 645:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={repairCost} onChangeText={setRepairCost} />
```

Source line 648:
```tsx
<Pressable style={[styles.outlineBtn, styles.actionBtn]} onPress={() => setShowRepairModal(false)}>
```

Source line 651:
```tsx
<Pressable
                style={[styles.primaryBtn, styles.actionBtn]}
                onPress={() =>
                  maintenanceMutation.mutate({
                    action: "Repair",
                    remark: repairRemark.trim() || "Repaired",
                    cost: Number(repairCost) || 0,
                  })
                }
              >
```

Source line 668:
```tsx
<Modal visible={showComplete} animationType="slide" transparent onRequestClose={() => setShowComplete(false)}>
```

Source line 710:
```tsx
<TextInput style={styles.modalInput} value={returnDiscount} onChangeText={setReturnDiscount} placeholder="0" keyboardType="decimal-pad" />
```

Source line 718:
```tsx
<TextInput style={styles.modalInput} value={returnPaidNow} onChangeText={setReturnPaidNow} placeholder="0" keyboardType="decimal-pad" />
```

Source line 731:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowComplete(false)}>
```

Source line 734:
```tsx
<Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!targetRentalId) return;
                    completeMutation.mutate({ id: targetRentalId, discount: Number(returnDiscount) || 0, paidNow: Number(returnPaidNow) || 0 });
                  }}
                >
```

Source line 760:
```tsx
<Modal visible={showQr} animationType="fade" transparent onRequestClose={() => setShowQr(false)}>
```

Source line 769:
```tsx
<Pressable style={styles.primaryBtn} onPress={() => setShowQr(false)}>
```

## Conditional behavior

Source line 163:
```tsx
if (!query) return true;
```

Source line 178:
```tsx
if (canShowPaymentQr) setShowQr(true);
```

Source line 455:
```tsx
if ((Number(scrapQty) || 0) <= 0) {
                    toast.error("Enter a valid scrap quantity");
                    return;
                  }
```

Source line 567:
```tsx
if (!saleCustomerId) {
                      toast.error("Select a customer for this sale");
                      return;
                    }
```

Source line 571:
```tsx
if ((Number(saleQty) || 0) <= 0) {
                      toast.error("Enter a valid sale quantity");
                      return;
                    }
```

Source line 737:
```tsx
if (!targetRentalId) return;
```

## Visible text

Source line 221:
```tsx
Available to rent:
```

Source line 223:
```tsx
Total stock:
```

Source line 224:
```tsx
Damaged:
```

Source line 225:
```tsx
Rent/day:
```

Source line 226:
```tsx
Purchase/unit:
```

Source line 247:
```tsx
MORE ACTIONS
```

Source line 251:
```tsx
Add Stock
```

Source line 255:
```tsx
Sell
```

Source line 260:
```tsx
Fix / Repair
```

Source line 266:
```tsx
Mark Damaged
```

Source line 271:
```tsx
Mark as Scrap
```

Source line 276:
```tsx
Current Holders
```

Source line 277:
```tsx
No active holder.
```

Source line 306:
```tsx
Qty
```

Source line 309:
```tsx
Rental #
```

Source line 309:
```tsx
| Since
```

Source line 317:
```tsx
Complete Return
```

Source line 326:
```tsx
Rental History
```

Source line 331:
```tsx
with dues
```

Source line 334:
```tsx
Total due
```

Source line 342:
```tsx
No history yet.
```

Source line 351:
```tsx
|
```

Source line 358:
```tsx
Paid
```

Source line 359:
```tsx
Due
```

Source line 369:
```tsx
Damage & Repair Logs
```

Source line 371:
```tsx
log
```

Source line 375:
```tsx
No logs yet.
```

Source line 398:
```tsx
Add Stock -
```

Source line 401:
```tsx
Quantity Added
```

Source line 405:
```tsx
Purchase Price / Unit (INR)
```

Source line 409:
```tsx
Note (Optional)
```

Source line 414:
```tsx
New stock after update
```

Source line 415:
```tsx
units
```

Source line 416:
```tsx
Expense to log:
```

Source line 421:
```tsx
Cancel
```

Source line 433:
```tsx
Mark as Scrap
```

Source line 434:
```tsx
Remove discarded units from stock and record the scrap event in history.
```

Source line 436:
```tsx
Quantity
```

Source line 440:
```tsx
Remark
```

Source line 444:
```tsx
Scrap history entry
```

Source line 445:
```tsx
unit
```

Source line 446:
```tsx
New stock:
```

Source line 446:
```tsx
units
```

Source line 450:
```tsx
Cancel
```

Source line 473:
```tsx
Sell Equipment
```

Source line 474:
```tsx
Record the customer, quantity, sale price, and payment status.
```

Source line 476:
```tsx
Customer
```

Source line 499:
```tsx
Select Customer
```

Source line 526:
```tsx
No matching customers.
```

Source line 530:
```tsx
Close
```

Source line 537:
```tsx
Quantity
```

Source line 541:
```tsx
Selling Price / Unit
```

Source line 546:
```tsx
Amount Paid
```

Source line 550:
```tsx
Remark
```

Source line 554:
```tsx
Sale total
```

Source line 557:
```tsx
Pending:
```

Source line 562:
```tsx
Cancel
```

Source line 607:
```tsx
Mark Damaged
```

Source line 608:
```tsx
Log the issue so it’s visible in maintenance history.
```

Source line 610:
```tsx
Remark / Details
```

Source line 615:
```tsx
Cancel
```

Source line 637:
```tsx
Fix / Repair
```

Source line 638:
```tsx
Capture repair details and cost for reporting.
```

Source line 640:
```tsx
Remark / Details
```

Source line 644:
```tsx
Repair Cost (INR)
```

Source line 649:
```tsx
Cancel
```

Source line 672:
```tsx
Receive Return
```

Source line 684:
```tsx
Equipment:
```

Source line 688:
```tsx
Quantity:
```

Source line 692:
```tsx
Rented At:
```

Source line 696:
```tsx
Rental Period:
```

Source line 697:
```tsx
day(s)
```

Source line 701:
```tsx
Estimated Rent:
```

Source line 705:
```tsx
Advance Paid:
```

Source line 709:
```tsx
Discount Amount (INR)
```

Source line 713:
```tsx
Return Revenue (after discount + advance):
```

Source line 717:
```tsx
Amount Paid Now (INR)
```

Source line 721:
```tsx
Pending Due:
```

Source line 727:
```tsx
No rental selected.
```

Source line 732:
```tsx
Cancel
```

Source line 763:
```tsx
Payment QR Code
```

Source line 767:
```tsx
No QR code configured.
```

Source line 770:
```tsx
Close
```

## Styles

Source line 779:
```tsx
styles = StyleSheet.create({
  h1: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.extrabold },
  h2: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  heroImage: { width: "100%", height: 190, borderRadius: radii.md, backgroundColor: colors.backgroundTinted },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: { width: 34, height: 34, borderRadius: radii.full, backgroundColor: colors.backgroundElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  sectionCaption: { fontSize: typography.sizes.xs, fontWeight: typography.weights.extrabold, color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.xs },
  rentCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.success, borderRadius: radii.md, paddingVertical: spacing.md,
    ...shadows.md,
  },
  rentCtaDisabled: { backgroundColor: colors.textMuted, opacity: 0.6 },
  rentCtaText: { color: colors.textInverse, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.sm, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.sm, padding: 9, backgroundColor: colors.backgroundElevated },
  primaryBtn: { backgroundColor: colors.primaryLight, borderRadius: radii.sm, alignItems: "center", paddingVertical: 11 },
  primaryBtnText: { color: colors.textInverse, fontWeight: typography.weights.bold },
  secondaryBtn: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.sm, alignItems: "center", paddingVertical: 11 },
  secondaryBtnText: { color: colors.textSecondary, fontWeight: typography.weights.bold },
  holderCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  holderHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  holderAvatar: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.backgroundTinted, alignItems: "center", justifyContent: "center" },
  holderAvatarImg: { width: 44, height: 44, borderRadius: radii.md },
  holderInitial: { fontWeight: typography.weights.extrabold, color: colors.primary, fontSize: typography.sizes.md },
  holderName: { fontWeight: typography.weights.extrabold, color: colors.primary },
  metaSmall: { color: colors.textMuted, fontSize: typography.sizes.xs },
  qtyChip: { backgroundColor: colors.successSoft, borderColor: colors.borderLight, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs, borderRadius: radii.full },
  qtyChipText: { color: colors.success, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.xs },
  returnBtn: { backgroundColor: colors.success, borderRadius: radii.sm, paddingVertical: spacing.xl, alignItems: "center" },
  returnBtnText: { color: colors.textInverse, fontWeight: typography.weights.extrabold },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  sheetScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: spacing.xl, width: "100%" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  overlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  sheetWide: { backgroundColor: colors.surface, padding: 18, borderRadius: radii.lg, width: "100%", maxWidth: 480, gap: spacing.md, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  sheetTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.extrabold, color: colors.primary },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.textMuted, fontWeight: typography.weights.bold },
  value: { color: colors.primary, fontWeight: typography.weights.bold },
  boldValue: { color: colors.primary, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.md },
  field: { gap: spacing.xs },
  sheetActions: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.sm },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.sm, alignItems: "center", paddingVertical: 11, backgroundColor: colors.backgroundElevated },
  outlineBtnText: { color: colors.textSecondary, fontWeight: typography.weights.bold },
  modalInput: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.sm, padding: spacing.xl, backgroundColor: colors.backgroundElevated, ...webInputReset },
  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  qrCard: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, alignItems: "center" },
  qrImage: { width: 260, height: 260, borderRadius: radii.md, backgroundColor: colors.background },
  historyCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  historyTitle: { fontWeight: typography.weights.extrabold, color: colors.primary },
  historyChip: { backgroundColor: colors.infoSoft, borderColor: colors.border, borderWidth: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs, borderRadius: radii.md },
  historyChipText: { color: colors.info, fontWeight: typography.weights.extrabold },
  historyAmounts: { flexDirection: "row", justifyContent: "space-between" },
  historySummary: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.sm },
  summaryPill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs, borderRadius: radii.full },
  summaryText: { color: colors.warningDark, fontWeight: typography.weights.bold },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logCount: { backgroundColor: colors.infoSoft, borderColor: colors.border, borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxs },
  logCountText: { color: colors.info, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.xs },
  logRow: { flexDirection: "row", alignItems: "center", gap: spacing.xl, backgroundColor: colors.backgroundElevated, borderRadius: radii.sm, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  logBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radii.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  logBadgeText: { color: colors.textInverse, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.xs },
  logDamage: { backgroundColor: colors.danger },
  logRepair: { backgroundColor: colors.success },
  logScrap: { backgroundColor: colors.warning },
  logMeta: { flex: 1, gap: 2 },
  logTitle: { fontWeight: typography.weights.extrabold, color: colors.primary },
  logSub: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  summaryCard: { backgroundColor: colors.background, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xxs },
  summaryLabel: { color: colors.textSecondary, fontWeight: typography.weights.bold, fontSize: typography.sizes.xs },
  summaryValue: { fontWeight: typography.weights.extrabold, color: colors.primary, fontSize: typography.sizes.md },
  summaryMeta: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  stockActions: { flexDirection: "row", gap: spacing.xl, justifyContent: "space-between" },
  formCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  formHint: { color: colors.textSecondary, fontSize: typography.sizes.xs },
  formActions: { flexDirection: "row", gap: spacing.xl, justifyContent: "space-between" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xl },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  actionPrimary: { backgroundColor: colors.infoSoft, borderColor: colors.border },
  actionDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.border },
  actionStock: { backgroundColor: colors.successSoft, borderColor: colors.borderLight },
  actionWarn: { backgroundColor: colors.warningSoft, borderColor: colors.border },
  actionInfo: { backgroundColor: colors.infoSoft, borderColor: colors.border },
  actionText: { color: colors.primaryLight, fontWeight: typography.weights.extrabold },
  actionTextDanger: { color: colors.danger, fontWeight: typography.weights.extrabold },
  actionTextStock: { color: colors.success, fontWeight: typography.weights.extrabold },
  actionTextWarn: { color: colors.warning, fontWeight: typography.weights.extrabold },
  actionTextInfo: { color: colors.primaryLight, fontWeight: typography.weights.extrabold },
  customerDropdown: { maxHeight: 240, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.xs, backgroundColor: colors.surface, gap: spacing.xs },
  customerOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.md, backgroundColor: colors.backgroundElevated },
  customerOptionSelected: { borderColor: colors.primaryLight, backgroundColor: colors.infoSoft },
  customerOptionText: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  customerOptionTextSelected: { color: colors.primaryLight, fontWeight: typography.weights.extrabold },
  selectField: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.sm, padding: 9, backgroundColor: colors.backgroundElevated, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectFieldText: { color: colors.textPrimary },
  selectFieldPlaceholder: { color: colors.textMuted },
  customerModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  customerModalCard: { width: "100%", maxWidth: 480, maxHeight: "80%", backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkboxBox: { width: 22, height: 22, borderRadius: radii.sm, borderWidth: 1.5, borderColor: colors.borderLight, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  checkboxLabel: { color: colors.textPrimary, fontWeight: typography.weights.bold },
})
```

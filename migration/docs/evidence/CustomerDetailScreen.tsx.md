# CustomerDetailScreen.tsx

Source: `mobile-app/src/screens/CustomerDetailScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 33:
```tsx
hasFeature("paymentQrCode")
```

Source line 35:
```tsx
useQuery({ queryKey: ["customers", "detail", customerId], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 35:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 36:
```tsx
useQuery({ queryKey: ["rentals-active", "customer", customerId], queryFn: () => rentalApi.active({ page: 1, page_size: 200 }) })
```

Source line 36:
```tsx
rentalApi.active({ page: 1, page_size: 200 })
```

Source line 37:
```tsx
useQuery({ queryKey: ["rentals-history", "customer", customerId], queryFn: () => rentalApi.history({ page: 1, page_size: 200, include_cancelled: true }) })
```

Source line 37:
```tsx
rentalApi.history({ page: 1, page_size: 200, include_cancelled: true })
```

Source line 38:
```tsx
useQuery({ queryKey: ["equipment", "customer-detail"], queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }) })
```

Source line 38:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 39:
```tsx
useQuery({ queryKey: ["equipment-sales", "customer", customerId], queryFn: () => equipmentApi.sales({ page: 1, page_size: 200, customer_id: customerId }) })
```

Source line 39:
```tsx
equipmentApi.sales({ page: 1, page_size: 200, customer_id: customerId })
```

Source line 40:
```tsx
useQuery({ queryKey: ["settings"], queryFn: settingsApi.list })
```

Source line 41:
```tsx
useQuery({ queryKey: ["settings", MAX_DISCOUNT_PERCENT_KEY], queryFn: () => settingsApi.get(MAX_DISCOUNT_PERCENT_KEY) })
```

Source line 41:
```tsx
settingsApi.get(MAX_DISCOUNT_PERCENT_KEY)
```

Source line 53:
```tsx
useState(false)
```

Source line 54:
```tsx
useState(false)
```

Source line 55:
```tsx
useState(false)
```

Source line 56:
```tsx
useState<string | null>(null)
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
useState("0")
```

Source line 60:
```tsx
useState("")
```

Source line 61:
```tsx
useState(false)
```

Source line 62:
```tsx
useState("")
```

Source line 63:
```tsx
useState("")
```

Source line 64:
```tsx
useState<string[]>([])
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
useState(false)
```

Source line 68:
```tsx
useState("")
```

Source line 69:
```tsx
useState(false)
```

Source line 70:
```tsx
useState("0")
```

Source line 71:
```tsx
useState<string | null>(null)
```

Source line 72:
```tsx
useState<string | null>(null)
```

Source line 73:
```tsx
useState(false)
```

Source line 94:
```tsx
toast.error("Please grant photo library access to add damage photos.")
```

Source line 107:
```tsx
uploadApi.uploadFile(asset.uri, fileName, mimeType)
```

Source line 110:
```tsx
toast.error(error instanceof Error ? error.message : "Could not upload photo.")
```

Source line 117:
```tsx
navigation.navigate("Invoice", { rentalId: rental.id })
```

Source line 120:
```tsx
useMutation({
    mutationFn: async (payload: {
      id: string;
      equipmentId: string;
      discount: number;
      paidNow: number;
      lateFee: number;
      dueDate?: string;
      damage?: { cost: number; description: string; photos: string[] };
    }) => {
      const rental = await rentalApi.complete(payload.id, payload.discount, payload.paidNow, payload.dueDate, payload.lateFee);
      let damageError: string | null = null;
      if (payload.damage) {
        try {
          await equipmentApi.maintenance(payload.equipmentId, "Damage", payload.damage.description || undefined, payload.damage.cost, {
            photos: payload.damage.photos,
            rentalId: payload.id,
            customerId,
          });
        } catch (err) {
          damageError = err instanceof Error ? err.message : "Could not save the damage report.";
        }
      }
      return { rental, damageError };
    },
    onSuccess: ({ rental, damageError }) => {
      setShowComplete(false);
      setTargetRentalId(null);
      setReturnDiscount("0");
      setReturnPaidNow("0");
      setReturnLateFee("0");
      setReturnDueDate("");
      setReportDamage(false);
      setDamageCost("");
      setDamageDescription("");
      setDamagePhotos([]);
      // Opens the payment-QR modal below; the invoice is shown once that's
      // dismissed (see its onPress) rather than navigating away immediately,
      // which would unmount this screen — and the QR modal along with it.
      // Plans without the paymentQrCode feature skip straight to the invoice.
      if (canShowPaymentQr) {
        setLastCompletedRentalId(rental.id);
        setShowQr(true);
      } else {
        navigation.navigate("Invoice", { rentalId: rental.id });
      }
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      if (damageError) {
        toast.warning(`Return completed, but the damage report failed to save: ${damageError}`);
      }
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not complete the return."),
  })
```

Source line 130:
```tsx
rentalApi.complete(payload.id, payload.discount, payload.paidNow, payload.dueDate, payload.lateFee)
```

Source line 134:
```tsx
equipmentApi.maintenance(payload.equipmentId, "Damage", payload.damage.description || undefined, payload.damage.cost, {
            photos: payload.damage.photos,
            rentalId: payload.id,
            customerId,
          })
```

Source line 164:
```tsx
navigation.navigate("Invoice", { rentalId: rental.id })
```

Source line 166:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 167:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 168:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 170:
```tsx
toast.warning(`Return completed, but the damage report failed to save: ${damageError}`)
```

Source line 173:
```tsx
toast.error(err instanceof Error ? err.message : "Could not complete the return.")
```

Source line 175:
```tsx
useMutation({
    mutationFn: async ({ discount, paidNow, rentalIds, dueDate }: { discount: number; paidNow: number; rentalIds: string[]; dueDate?: string }) => {
      const selectedIds = new Set(rentalIds);
      const selectedRentals = active.filter((rental) => selectedIds.has(rental.id));
      const allocations = allocateBatchReturnAmounts(selectedRentals, equipmentQuery.data?.items || [], discount, paidNow);
      const results = [];
      for (const allocation of allocations) {
        results.push(await rentalApi.complete(allocation.rental.id, allocation.discount, allocation.paidNow, allocation.pending > 0 ? dueDate : undefined));
      }
      return results;
    },
    onSuccess: (results) => {
      setShowBatchComplete(false);
      if (canShowPaymentQr) {
        setBatchJustCompleted(true);
        setShowQr(true);
      } else {
        navigation.navigate("InvoiceList");
      }
      toast.success(`${results.length} rental(s) completed — view their invoices from the Invoices list.`);
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not complete returns"),
  })
```

Source line 182:
```tsx
rentalApi.complete(allocation.rental.id, allocation.discount, allocation.paidNow, allocation.pending > 0 ? dueDate : undefined)
```

Source line 192:
```tsx
navigation.navigate("InvoiceList")
```

Source line 194:
```tsx
toast.success(`${results.length} rental(s) completed — view their invoices from the Invoices list.`)
```

Source line 195:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 196:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 197:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 199:
```tsx
toast.error(err instanceof Error ? err.message : "Could not complete returns")
```

Source line 201:
```tsx
useMutation({
    mutationFn: ({ id, amountPaid, dueDate }: { id: string; amountPaid: number; dueDate?: string }) =>
      rentalApi.updatePayment(id, amountPaid, undefined, dueDate),
    onSuccess: () => {
      setShowPayment(false);
      setPaymentAmount("0");
      setPaymentDueDate("");
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not update payment"),
  })
```

Source line 203:
```tsx
rentalApi.updatePayment(id, amountPaid, undefined, dueDate)
```

Source line 208:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 209:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 211:
```tsx
toast.error(err instanceof Error ? err.message : "Could not update payment")
```

Source line 213:
```tsx
useMutation({
    mutationFn: ({ id, amountPaid }: { id: string; amountPaid: number }) => equipmentApi.updateSalePayment(id, amountPaid),
    onSuccess: () => {
      setShowSalePayment(false);
      setTargetSaleId(null);
      setPaymentAmount("0");
      queryClient.invalidateQueries({ queryKey: ["equipment-sales"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not update sale payment"),
  })
```

Source line 214:
```tsx
equipmentApi.updateSalePayment(id, amountPaid)
```

Source line 219:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment-sales"] })
```

Source line 220:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 222:
```tsx
toast.error(err instanceof Error ? err.message : "Could not update sale payment")
```

Source line 636:
```tsx
toast.warning("Add a damage cost or description, or turn off damage reporting.")
```

Source line 692:
```tsx
navigation.navigate("Invoice", { rentalId })
```

Source line 695:
```tsx
navigation.navigate("InvoiceList")
```

## Form controls and modal declarations

Source line 263:
```tsx
<Pressable style={styles.docBtn} onPress={() => setShowDoc(true)}>
```

Source line 291:
```tsx
<Pressable
                style={[styles.returnAllBtn, batchCompleteMutation.isPending && styles.disabledBtn]}
                onPress={() => setShowBatchComplete(true)}
                disabled={batchCompleteMutation.isPending}
              >
```

Source line 326:
```tsx
<Pressable
                    style={styles.returnBtn}
                    onPress={() => openReturnModal(item.id)}
                  >
```

Source line 381:
```tsx
<Pressable
                      style={[styles.payBtn, { flex: 1 }]}
                      onPress={() => {
                        setTargetRentalId(item.id);
                        setPaymentAmount(String(item.amount_due || 0));
                        setPaymentDueDate(item.due_date ? item.due_date.slice(0, 10) : "");
                        setShowPayment(true);
                      }}
                    >
```

Source line 394:
```tsx
<Pressable
                      style={[styles.shareInvoiceBtn, item.amount_due <= 0 && { flex: 1 }]}
                      onPress={() => viewRentalInvoice(item)}
                      accessibilityRole="button"
                      accessibilityLabel="View invoice"
                    >
```

Source line 436:
```tsx
<Pressable
                  style={styles.payBtn}
                  onPress={() => {
                    setTargetSaleId(item.id);
                    setPaymentAmount(String(item.amount_due || 0));
                    setShowSalePayment(true);
                  }}
                >
```

Source line 452:
```tsx
<Modal visible={showComplete} animationType="slide" transparent onRequestClose={() => setShowComplete(false)}>
```

Source line 499:
```tsx
<TextInput
                      style={[styles.input, discountExceedsCap && styles.inputError]}
                      value={returnDiscount}
                      onChangeText={(val) => {
                        const numeric = Number(val);
                        if (maxDiscountAmount !== null && val.trim() !== "" && !Number.isNaN(numeric) && numeric > maxDiscountAmount) {
                          setReturnDiscount(String(maxDiscountAmount));
                        } else {
                          setReturnDiscount(val);
                        }
                      }}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
```

Source line 519:
```tsx
<TextInput
                      style={styles.input}
                      value={returnLateFee}
                      onChangeText={setReturnLateFee}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
```

Source line 533:
```tsx
<TextInput
                      style={[styles.input, paidExceedsRevenue && styles.inputError]}
                      value={returnPaidNow}
                      onChangeText={(val) => {
                        const numeric = Number(val);
                        if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > revenue) {
                          setReturnPaidNow(String(revenue));
                        } else {
                          setReturnPaidNow(val);
                        }
                      }}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
```

Source line 556:
```tsx
<DatePickerField
                        label="Next payment reminder date (optional)"
                        value={returnDueDate}
                        onChange={setReturnDueDate}
                        placeholder="No reminder date set"
                      />
```

Source line 566:
```tsx
<Pressable
                    style={styles.damageToggleRow}
                    onPress={() => setReportDamage((v) => !v)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: reportDamage }}
                  >
```

Source line 583:
```tsx
<TextInput style={styles.input} value={damageCost} onChangeText={setDamageCost} placeholder="0" keyboardType="decimal-pad" />
```

Source line 587:
```tsx
<TextInput
                          style={[styles.input, { minHeight: 60 }]}
                          value={damageDescription}
                          onChangeText={setDamageDescription}
                          placeholder="What's damaged and how?"
                          multiline
                        />
```

Source line 601:
```tsx
<Pressable
                                style={styles.damagePhotoRemove}
                                onPress={() => setDamagePhotos((prev) => prev.filter((_, i) => i !== index))}
                              >
```

Source line 610:
```tsx
<Pressable style={styles.damagePhotoAdd} onPress={pickDamagePhoto} disabled={uploadingDamagePhoto}>
```

Source line 627:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowComplete(false)}>
```

Source line 630:
```tsx
<Pressable
                  style={[styles.primaryBtn, completeMutation.isPending && styles.disabledBtn]}
                  disabled={completeMutation.isPending}
                  onPress={() => {
                    if (!targetRentalId || !targetRental) return;
                    if (reportDamage && !damageCost.trim() && !damageDescription.trim()) {
                      toast.warning("Add a damage cost or description, or turn off damage reporting.");
                      return;
                    }
                    completeMutation.mutate({
                      id: targetRentalId,
                      equipmentId: targetRental.equipment_id,
                      discount: Number(returnDiscount) || 0,
                      paidNow: Number(returnPaidNow) || 0,
                      lateFee: Number(returnLateFee) || 0,
                      dueDate: returnDueDate || undefined,
                      damage: reportDamage
                        ? { cost: Number(damageCost) || 0, description: damageDescription.trim(), photos: damagePhotos }
                        : undefined,
                    });
                  }}
                >
```

Source line 662:
```tsx
<BatchReturnModal
        visible={showBatchComplete}
        rentals={active}
        equipmentItems={equipmentQuery.data?.items || []}
        title={`Return All - ${customer.name}`}
        bottomSpacing={getBottomSpacing(16)}
        isPending={batchCompleteMutation.isPending}
        onClose={() => {
          if (batchCompleteMutation.isPending) return;
          setShowBatchComplete(false);
        }}
        onConfirm={({ discount, paidNow, rentalIds, dueDate }) => batchCompleteMutation.mutate({ discount, paidNow, rentalIds, dueDate })}
      />
```

Source line 676:
```tsx
<Modal visible={showQr} animationType="fade" transparent onRequestClose={() => setShowQr(false)}>
```

Source line 685:
```tsx
<Pressable
              style={styles.qrCloseBtn}
              onPress={() => {
                setShowQr(false);
                if (lastCompletedRentalId) {
                  const rentalId = lastCompletedRentalId;
                  setLastCompletedRentalId(null);
                  navigation.navigate("Invoice", { rentalId });
                } else if (batchJustCompleted) {
                  setBatchJustCompleted(false);
                  navigation.navigate("InvoiceList");
                }
              }}
            >
```

Source line 706:
```tsx
<Modal visible={showDoc} animationType="fade" transparent onRequestClose={() => setShowDoc(false)}>
```

Source line 711:
```tsx
<Pressable style={styles.docCloseBtn} onPress={() => setShowDoc(false)} hitSlop={12}>
```

Source line 727:
```tsx
<Modal visible={showPayment} animationType="fade" transparent onRequestClose={() => setShowPayment(false)}>
```

Source line 741:
```tsx
<TextInput
                      style={[styles.input, exceedsDue && styles.inputError]}
                      value={paymentAmount}
                      onChangeText={(val) => {
                        const numeric = Number(val);
                        if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > dueAmount) {
                          setPaymentAmount(String(dueAmount));
                        } else {
                          setPaymentAmount(val);
                        }
                      }}
                      keyboardType="decimal-pad"
                    />
```

Source line 757:
```tsx
<DatePickerField
                          label="Next payment reminder date (optional)"
                          value={paymentDueDate}
                          onChange={setPaymentDueDate}
                          placeholder="No reminder date set"
                        />
```

Source line 769:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowPayment(false)}>
```

Source line 772:
```tsx
<Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!targetRentalId) return;
                    paymentMutation.mutate({ id: targetRentalId, amountPaid: Number(paymentAmount) || 0, dueDate: paymentDueDate || undefined });
                  }}
                >
```

Source line 789:
```tsx
<Modal visible={showSalePayment} animationType="fade" transparent onRequestClose={() => setShowSalePayment(false)}>
```

Source line 796:
```tsx
<TextInput style={styles.input} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" />
```

Source line 798:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowSalePayment(false)}>
```

Source line 801:
```tsx
<Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!targetSaleId) return;
                    salePaymentMutation.mutate({ id: targetSaleId, amountPaid: Number(paymentAmount) || 0 });
                  }}
                >
```

## Conditional behavior

Source line 93:
```tsx
if (!permission.granted) {
        toast.error("Please grant photo library access to add damage photos.");
        return;
      }
```

Source line 102:
```tsx
if (result.canceled || !result.assets?.length) return;
```

Source line 132:
```tsx
if (payload.damage) {
        try {
          await equipmentApi.maintenance(payload.equipmentId, "Damage", payload.damage.description || undefined, payload.damage.cost, {
            photos: payload.damage.photos,
            rentalId: payload.id,
            customerId,
          });
        } catch (err) {
          damageError = err instanceof Error ? err.message : "Could not save the damage report.";
        }
      }
```

Source line 160:
```tsx
if (canShowPaymentQr) {
        setLastCompletedRentalId(rental.id);
        setShowQr(true);
      } else {
        navigation.navigate("Invoice", { rentalId: rental.id });
      }
```

Source line 169:
```tsx
if (damageError) {
        toast.warning(`Return completed, but the damage report failed to save: ${damageError}`);
      }
```

Source line 188:
```tsx
if (canShowPaymentQr) {
        setBatchJustCompleted(true);
        setShowQr(true);
      } else {
        navigation.navigate("InvoiceList");
      }
```

Source line 225:
```tsx
if (!customer) {
    return (
      <ScreenContainer>
        <Text>Customer not found.</Text>
      </ScreenContainer>
    );
  }
```

Source line 237:
```tsx
if (!first) return "";
```

Source line 504:
```tsx
if (maxDiscountAmount !== null && val.trim() !== "" && !Number.isNaN(numeric) && numeric > maxDiscountAmount) {
                          setReturnDiscount(String(maxDiscountAmount));
                        } else {
                          setReturnDiscount(val);
                        }
```

Source line 538:
```tsx
if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > revenue) {
                          setReturnPaidNow(String(revenue));
                        } else {
                          setReturnPaidNow(val);
                        }
```

Source line 634:
```tsx
if (!targetRentalId || !targetRental) return;
```

Source line 635:
```tsx
if (reportDamage && !damageCost.trim() && !damageDescription.trim()) {
                      toast.warning("Add a damage cost or description, or turn off damage reporting.");
                      return;
                    }
```

Source line 670:
```tsx
if (batchCompleteMutation.isPending) return;
```

Source line 689:
```tsx
if (lastCompletedRentalId) {
                  const rentalId = lastCompletedRentalId;
                  setLastCompletedRentalId(null);
                  navigation.navigate("Invoice", { rentalId });
                } else if (batchJustCompleted) {
                  setBatchJustCompleted(false);
                  navigation.navigate("InvoiceList");
                }
```

Source line 693:
```tsx
if (batchJustCompleted) {
                  setBatchJustCompleted(false);
                  navigation.navigate("InvoiceList");
                }
```

Source line 746:
```tsx
if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > dueAmount) {
                          setPaymentAmount(String(dueAmount));
                        } else {
                          setPaymentAmount(val);
                        }
```

Source line 775:
```tsx
if (!targetRentalId) return;
```

Source line 804:
```tsx
if (!targetSaleId) return;
```

## Visible text

Source line 228:
```tsx
Customer not found.
```

Source line 261:
```tsx
Phone:
```

Source line 265:
```tsx
View Document
```

Source line 268:
```tsx
Address:
```

Source line 275:
```tsx
Ongoing
```

Source line 279:
```tsx
History
```

Source line 283:
```tsx
Pending
```

Source line 289:
```tsx
Ongoing Rentals
```

Source line 307:
```tsx
No ongoing rentals.
```

Source line 319:
```tsx
Qty
```

Source line 325:
```tsx
Started
```

Source line 330:
```tsx
Complete Return
```

Source line 339:
```tsx
Rental History
```

Source line 344:
```tsx
with dues
```

Source line 347:
```tsx
Total due
```

Source line 355:
```tsx
No history entries.
```

Source line 361:
```tsx
•
```

Source line 368:
```tsx
Paid
```

Source line 370:
```tsx
Due
```

Source line 376:
```tsx
Reminder set for
```

Source line 390:
```tsx
Update Payment
```

Source line 401:
```tsx
View Invoice
```

Source line 412:
```tsx
Equipment Sale Dues
```

Source line 419:
```tsx
No pending sale payments.
```

Source line 425:
```tsx
Sold
```

Source line 425:
```tsx
• Qty
```

Source line 426:
```tsx
Status
```

Source line 433:
```tsx
Paid
```

Source line 434:
```tsx
Due
```

Source line 444:
```tsx
Update Sale Payment
```

Source line 457:
```tsx
Receive Return
```

Source line 473:
```tsx
Equipment:
```

Source line 477:
```tsx
Quantity:
```

Source line 481:
```tsx
Rented At:
```

Source line 485:
```tsx
Rental Period:
```

Source line 486:
```tsx
day(s)
```

Source line 490:
```tsx
Estimated Rent:
```

Source line 494:
```tsx
Advance Paid:
```

Source line 498:
```tsx
Discount Amount (INR)
```

Source line 514:
```tsx
Max discount:
```

Source line 514:
```tsx
% (
```

Source line 514:
```tsx
)
```

Source line 518:
```tsx
Late Fee (INR)
```

Source line 528:
```tsx
Return Revenue (after discount + late fee - advance):
```

Source line 532:
```tsx
Amount Paid Now (INR)
```

Source line 547:
```tsx
Max:
```

Source line 550:
```tsx
Pending Due:
```

Source line 576:
```tsx
Report damage on this item
```

Source line 582:
```tsx
Damage Cost (INR)
```

Source line 586:
```tsx
Damage Description
```

Source line 596:
```tsx
Photos (
```

Source line 596:
```tsx
/3)
```

Source line 628:
```tsx
Cancel
```

Source line 679:
```tsx
Payment QR Code
```

Source line 683:
```tsx
No QR code configured.
```

Source line 699:
```tsx
Close
```

Source line 710:
```tsx
Document
```

Source line 732:
```tsx
Update Payment
```

Source line 740:
```tsx
Amount
```

Source line 754:
```tsx
Max:
```

Source line 770:
```tsx
Cancel
```

Source line 794:
```tsx
Update Sale Payment
```

Source line 795:
```tsx
Amount
```

Source line 799:
```tsx
Cancel
```

## Styles

Source line 821:
```tsx
styles = StyleSheet.create({
  h1: { fontSize: typography.sizes.xl, fontWeight: typography.weights.extrabold, color: colors.textPrimary },
  h2: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary },
  title: { fontWeight: typography.weights.bold, fontSize: typography.sizes.sm, color: colors.textPrimary },
  meta: { color: colors.textMuted, fontSize: typography.sizes.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  inner: { backgroundColor: colors.backgroundElevated, borderRadius: radii.sm, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  historyCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.sm },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  historyChip: { backgroundColor: colors.infoSoft, borderColor: colors.borderFocus, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.md },
  historyChipText: { color: colors.info, fontWeight: typography.weights.extrabold },
  historyAmounts: { flexDirection: "row", justifyContent: "space-between" },
  payBtn: { backgroundColor: colors.primaryLight, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center", minHeight: 44 },
  payBtnText: { color: colors.textInverse, fontWeight: typography.weights.extrabold },
  dueDateChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.warningSoft, alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full },
  dueDateChipText: { color: colors.warningDark, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  historyActionsRow: { flexDirection: "row", gap: spacing.sm },
  shareInvoiceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: colors.primaryLight, borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, minHeight: 44 },
  shareInvoiceBtnText: { color: colors.primary, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.sm },
  inputError: { borderColor: colors.danger },
  helperText: { color: colors.textMuted, fontSize: typography.sizes.xs, marginTop: -4 },
  damageToggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  checkboxChecked: { backgroundColor: colors.danger, borderColor: colors.danger },
  damageToggleText: { color: colors.textPrimary, fontWeight: typography.weights.bold, flex: 1 },
  damagePanel: { gap: spacing.sm, backgroundColor: colors.dangerSoft, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.danger },
  damagePhotoRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  damagePhotoThumbWrap: { width: 72, height: 72, borderRadius: radii.sm, overflow: "hidden", position: "relative", backgroundColor: colors.backgroundElevated },
  damagePhotoThumb: { width: "100%", height: "100%" },
  damagePhotoRemove: { position: "absolute", top: 3, right: 3, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 3 },
  damagePhotoAdd: { width: 72, height: 72, borderRadius: radii.sm, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  historySummary: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.sm },
  summaryPill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  summaryText: { color: colors.warningDark, fontWeight: typography.weights.bold },
  dueTotal: { color: colors.danger, fontWeight: typography.weights.extrabold },
  hero: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", ...shadows.sm },
  avatarWrap: { width: 86, height: 86, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  avatarInitial: { fontWeight: typography.weights.black, fontSize: typography.sizes.xl, color: colors.primary },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: spacing.xs, ...shadows.sm },
  statValue: { fontWeight: typography.weights.black, fontSize: typography.sizes.lg, color: colors.primaryLight },
  statLabel: { color: colors.textMuted, fontWeight: typography.weights.bold, fontSize: typography.sizes.xs },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheetScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, gap: spacing.md },
  sheetTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.extrabold, color: colors.textPrimary },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.textSecondary, fontWeight: typography.weights.bold },
  value: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  boldValue: { color: colors.textPrimary, fontWeight: typography.weights.extrabold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, alignItems: "center", paddingVertical: spacing.md, backgroundColor: colors.backgroundElevated, minHeight: 44 },
  outlineBtnText: { fontWeight: typography.weights.extrabold, color: colors.textPrimary },
  primaryBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radii.md, alignItems: "center", paddingVertical: spacing.md, minHeight: 44, ...shadows.md },
  primaryBtnText: { color: colors.textInverse, fontWeight: typography.weights.extrabold },
  field: { gap: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: radii.sm, padding: spacing.md, backgroundColor: colors.backgroundElevated },
  rentalCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs, ...shadows.sm },
  rentalImageWrap: { position: "relative" },
  rentalImage: { width: "100%", height: 150, borderRadius: radii.md, backgroundColor: colors.background },
  rentalImagePlaceholder: { borderWidth: 1, borderColor: colors.border },
  rentalChip: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(31,122,79,0.9)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  rentalChipText: { color: colors.textInverse, fontWeight: typography.weights.extrabold, fontSize: typography.sizes.xs },
  returnBtn: { marginTop: spacing.xs, backgroundColor: colors.success, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center", minHeight: 44 },
  returnBtnText: { color: colors.textInverse, fontWeight: typography.weights.extrabold },
  returnAllBtn: { backgroundColor: colors.success, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: "center", minHeight: 44 },
  returnAllBtnText: { color: colors.textInverse, fontWeight: typography.weights.extrabold },
  disabledBtn: { opacity: 0.65 },
  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  qrCard: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, alignItems: "center" },
  qrImage: { width: 260, height: 260, borderRadius: radii.md, backgroundColor: colors.background },
  qrCloseBtn: { minWidth: 160, backgroundColor: colors.primary, borderRadius: radii.md, alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.lg, ...shadows.md },
  qrCloseBtnText: { color: colors.textInverse, fontWeight: typography.weights.black, fontSize: typography.sizes.md },

  // Document button in hero
  docBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  docBtnText: { color: colors.info, fontWeight: typography.weights.bold, fontSize: typography.sizes.sm, textDecorationLine: "underline" },

  // Document viewer modal
  docOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  docViewerCard: { width: "100%", maxWidth: 480, backgroundColor: colors.surface, borderRadius: radii.xl, overflow: "hidden", ...shadows.xl },
  docViewerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  docViewerTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.textPrimary },
  docCloseBtn: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.backgroundElevated, alignItems: "center", justifyContent: "center" },
  docViewerImage: { width: "100%", height: 420, backgroundColor: colors.background },
})
```

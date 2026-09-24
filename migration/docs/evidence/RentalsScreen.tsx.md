# RentalsScreen.tsx

Source: `mobile-app/src/screens/RentalsScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 41:
```tsx
hasFeature("paymentQrCode")
```

Source line 44:
```tsx
useState<TabMode>("ongoing")
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
useState(false)
```

Source line 49:
```tsx
useState(false)
```

Source line 50:
```tsx
useState(false)
```

Source line 51:
```tsx
useState<string | null>(null)
```

Source line 52:
```tsx
useState<string | null>(null)
```

Source line 53:
```tsx
useState(false)
```

Source line 54:
```tsx
useState<string[]>([])
```

Source line 55:
```tsx
useState<string | null>(null)
```

Source line 57:
```tsx
useState<BundleDraft[]>([])
```

Source line 58:
```tsx
useState<string | null>(null)
```

Source line 60:
```tsx
useState("")
```

Source line 61:
```tsx
useState<Array<{ equipment_id: string; quantity: string }>>([])
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

Source line 66:
```tsx
useState("")
```

Source line 67:
```tsx
useState("")
```

Source line 68:
```tsx
useState("0")
```

Source line 69:
```tsx
useState("")
```

Source line 71:
```tsx
useState("0")
```

Source line 72:
```tsx
useState("0")
```

Source line 73:
```tsx
useState("0")
```

Source line 74:
```tsx
useState("0")
```

Source line 75:
```tsx
useState("")
```

Source line 76:
```tsx
useState("")
```

Source line 78:
```tsx
useQuery({
    queryKey: ["rentals-active", dateFrom, dateTo],
    queryFn: () =>
      rentalApi.active({
        page: 1,
        page_size: 200,
        date_from: dateFrom.trim() || undefined,
        date_to: dateTo.trim() || undefined,
      }),
  })
```

Source line 81:
```tsx
rentalApi.active({
        page: 1,
        page_size: 200,
        date_from: dateFrom.trim() || undefined,
        date_to: dateTo.trim() || undefined,
      })
```

Source line 88:
```tsx
useQuery({
    queryKey: ["rentals-history", dateFrom, dateTo],
    queryFn: () =>
      rentalApi.history({
        page: 1,
        page_size: 200,
        include_cancelled: true,
        date_from: dateFrom.trim() || undefined,
        date_to: dateTo.trim() || undefined,
      }),
  })
```

Source line 91:
```tsx
rentalApi.history({
        page: 1,
        page_size: 200,
        include_cancelled: true,
        date_from: dateFrom.trim() || undefined,
        date_to: dateTo.trim() || undefined,
      })
```

Source line 99:
```tsx
useQuery({ queryKey: ["equipment", "rentals"], queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }) })
```

Source line 99:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 100:
```tsx
useQuery({ queryKey: ["customers", "rentals"], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 100:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 101:
```tsx
useQuery({ queryKey: ["settings"], queryFn: settingsApi.list })
```

Source line 193:
```tsx
useMutation({
    mutationFn: () =>
      rentalApi.createBulk({
        customer_id: customerId,
        items: selectedItems.map((i) => ({ equipment_id: i.equipment_id, quantity: Number(i.quantity) || 1 })),
        expected_return_date: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        advance_amount: Number(advanceAmount) || 0,
        remark: remark || undefined,
      }),
    onSuccess: () => {
      const doneBundle = selectedBundleId;
      setShowCreate(false);
      setCustomerId("");
      setItemsAndPersist([]);
      setShowSelectedOnly(false);
      setExpectedReturnDate("");
      setAdvanceAmount("0");
      setRemark("");
      if (doneBundle) {
        removeBundle(doneBundle);
      }
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not create the rental."),
  })
```

Source line 195:
```tsx
rentalApi.createBulk({
        customer_id: customerId,
        items: selectedItems.map((i) => ({ equipment_id: i.equipment_id, quantity: Number(i.quantity) || 1 })),
        expected_return_date: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        advance_amount: Number(advanceAmount) || 0,
        remark: remark || undefined,
      })
```

Source line 214:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 215:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 217:
```tsx
toast.error(err instanceof Error ? err.message : "Could not create the rental.")
```

Source line 220:
```tsx
useMutation({
    mutationFn: ({ id, discount, paidNow, lateFee }: { id: string; discount: number; paidNow: number; lateFee: number }) =>
      rentalApi.complete(id, discount, paidNow, undefined, lateFee),
    onSuccess: (rental) => {
      setShowComplete(false);
      setTargetRentalId(null);
      setReturnDiscount("0");
      setReturnPaidNow("0");
      setReturnLateFee("0");
      // Opens the payment-QR modal below; the invoice is shown once that's
      // dismissed (see its onPress) rather than navigating away immediately,
      // which would unmount this screen — and the QR modal along with it —
      // before the customer's had a chance to scan it. Plans without the
      // paymentQrCode feature skip straight to the invoice.
      if (canShowPaymentQr) {
        setLastCompletedRentalId(rental.id);
        setShowQr(true);
      } else {
        navigation.navigate("Invoice", { rentalId: rental.id });
      }
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not complete the return."),
  })
```

Source line 222:
```tsx
rentalApi.complete(id, discount, paidNow, undefined, lateFee)
```

Source line 238:
```tsx
navigation.navigate("Invoice", { rentalId: rental.id })
```

Source line 240:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 241:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 242:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 244:
```tsx
toast.error(err instanceof Error ? err.message : "Could not complete the return.")
```

Source line 247:
```tsx
useMutation({
    mutationFn: async ({ discount, paidNow, rentalIds, dueDate }: { discount: number; paidNow: number; rentalIds: string[]; dueDate?: string }) => {
      const selectedIds = new Set(rentalIds);
      const rentals = activeItems.filter((r) => r.customer_id === batchReturnCustomerId && selectedIds.has(r.id));
      const allocations = allocateBatchReturnAmounts(rentals, equipmentQuery.data?.items || [], discount, paidNow);
      const results = [];
      for (const allocation of allocations) {
        results.push(await rentalApi.complete(allocation.rental.id, allocation.discount, allocation.paidNow, allocation.pending > 0 ? dueDate : undefined));
      }
      return results;
    },
    onSuccess: (results) => {
      setShowBatchComplete(false);
      setBatchReturnCustomerId(null);
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
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "Could not complete returns");
    },
  })
```

Source line 254:
```tsx
rentalApi.complete(allocation.rental.id, allocation.discount, allocation.paidNow, allocation.pending > 0 ? dueDate : undefined)
```

Source line 265:
```tsx
navigation.navigate("InvoiceList")
```

Source line 267:
```tsx
toast.success(`${results.length} rental(s) completed — view their invoices from the Invoices list.`)
```

Source line 268:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 269:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 270:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 273:
```tsx
toast.error(err instanceof Error ? err.message : "Could not complete returns")
```

Source line 277:
```tsx
useMutation({
    mutationFn: rentalApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not cancel the rental."),
  })
```

Source line 280:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 281:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 282:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 284:
```tsx
toast.error(err instanceof Error ? err.message : "Could not cancel the rental.")
```

Source line 287:
```tsx
useMutation({
    mutationFn: ({ id, amountPaid }: { id: string; amountPaid: number }) => rentalApi.updatePayment(id, amountPaid),
    onSuccess: () => {
      setShowPayment(false);
      setTargetRentalId(null);
      setPaymentAmount("0");
      queryClient.invalidateQueries({ queryKey: ["rentals-history"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not update payment."),
  })
```

Source line 288:
```tsx
rentalApi.updatePayment(id, amountPaid)
```

Source line 293:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-history"] })
```

Source line 295:
```tsx
toast.error(err instanceof Error ? err.message : "Could not update payment.")
```

Source line 298:
```tsx
useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { expected_return_date?: string | null; quantity: number; advance_amount: number; remark?: string | null };
    }) => rentalApi.updateActive(id, payload),
    onSuccess: () => {
      setShowRentalDetails(false);
      setTargetRentalId(null);
      queryClient.invalidateQueries({ queryKey: ["rentals-active"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => {
      toast.error(err instanceof Error ? err.message : "Could not update rental");
    },
  })
```

Source line 305:
```tsx
rentalApi.updateActive(id, payload)
```

Source line 309:
```tsx
queryClient.invalidateQueries({ queryKey: ["rentals-active"] })
```

Source line 310:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 313:
```tsx
toast.error(err instanceof Error ? err.message : "Could not update rental")
```

Source line 322:
```tsx
navigation.navigate("Invoice", { rentalId: rental.id })
```

Source line 327:
```tsx
toast.warning("No phone number on file for this customer.")
```

Source line 330:
```tsx
Linking.openURL(`tel:${phone}`)
```

Source line 395:
```tsx
customerApi.list({ page: 1, page_size: 50, search: customerPhone.trim() || undefined })
```

Source line 804:
```tsx
toast.error("Select at least one product.")
```

Source line 808:
```tsx
toast.error("Select a customer (search by phone).")
```

Source line 1036:
```tsx
navigation.navigate("Invoice", { rentalId })
```

Source line 1039:
```tsx
navigation.navigate("InvoiceList")
```

## Form controls and modal declarations

Source line 448:
```tsx
<Pressable style={styles.callMiniBtn} onPress={() => callCustomer(item.customer.phone)}>
```

Source line 451:
```tsx
<Pressable
            style={[styles.returnAllBtn, (batchCompleteMutation.isPending && batchReturnCustomerId === item.customer.id) && { opacity: 0.6 }]}
            onPress={() => handleReturnAll(item.customer.id)}
            disabled={batchCompleteMutation.isPending && batchReturnCustomerId === item.customer.id}
          >
```

Source line 471:
```tsx
<Pressable
            key={rental.id}
            style={styles.rentalItemRow}
            onPress={() => { setTargetRentalId(rental.id); setShowRentalDetails(true); }}
          >
```

Source line 496:
```tsx
<Pressable
                style={styles.returnBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setTargetRentalId(rental.id);
                  setShowComplete(true);
                }}
                hitSlop={8}
              >
```

Source line 519:
```tsx
<Pressable
        style={styles.historyCard}
        onPress={() => { setTargetRentalId(item.id); setShowRentalDetails(true); }}
      >
```

Source line 574:
```tsx
<Pressable
              style={styles.addPaymentBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                setTargetRentalId(item.id);
                setShowPayment(true);
              }}
            >
```

Source line 587:
```tsx
<Pressable
              style={styles.shareInvoiceMiniBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                viewRentalInvoice(item);
              }}
            >
```

Source line 598:
```tsx
<Pressable
            style={styles.callMiniBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              callCustomer(customerById(item.customer_id)?.phone);
            }}
          >
```

Source line 617:
```tsx
<Pressable style={[styles.tag, selected && styles.tagSelected]} onPress={() => toggleSelectItem(item.id)}>
```

Source line 625:
```tsx
<TextInput
            style={styles.input}
            value={selected.quantity}
            onChangeText={(v) => setQuantityFor(item.id, v)}
            keyboardType="number-pad"
            placeholder="Quantity"
          />
```

Source line 642:
```tsx
<Pressable
          style={styles.headerFilterIcon}
          onPress={() => {/* filter toggle */}}
          accessibilityRole="button"
          accessibilityLabel="Filter options"
        >
```

Source line 655:
```tsx
<TouchableOpacity
            style={[styles.segPill, mode === "ongoing" && styles.segPillActive]}
            onPress={() => setMode("ongoing")}
            activeOpacity={0.8}
          >
```

Source line 664:
```tsx
<TouchableOpacity
            style={[styles.segPill, mode === "history" && styles.segPillActive]}
            onPress={() => setMode("history")}
            activeOpacity={0.8}
          >
```

Source line 678:
```tsx
<DatePickerField
          containerStyle={styles.filterChip}
          placeholder={mode === "ongoing" ? "From date" : "From return"}
          value={dateFrom}
          onChange={setDateFrom}
          allowPast
        />
```

Source line 685:
```tsx
<DatePickerField
          containerStyle={styles.filterChip}
          placeholder="To date"
          value={dateTo}
          onChange={setDateTo}
          allowPast
        />
```

Source line 693:
```tsx
<Pressable
            style={styles.clearChip}
            onPress={() => { setDateFrom(""); setDateTo(""); }}
          >
```

Source line 732:
```tsx
<Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
```

Source line 738:
```tsx
<Pressable
                key={bundle.id}
                style={[styles.bundleChip, selectedBundleId === bundle.id && styles.bundleChipActive]}
                onPress={() => switchBundle(bundle.id)}
              >
```

Source line 748:
```tsx
<TouchableOpacity onPress={() => removeBundle(bundle.id)}>
```

Source line 755:
```tsx
<Pressable style={styles.secondaryActionBtn} onPress={() => createBundle()}>
```

Source line 758:
```tsx
<TextInput
            style={styles.input}
            placeholder="Search product or category"
            value={rentalSearch}
            onChangeText={setRentalSearch}
          />
```

Source line 765:
```tsx
<Pressable style={[styles.secondaryActionBtn, { flex: 1 }]} onPress={selectAllFiltered} disabled={!filteredEquipment.length}>
```

Source line 768:
```tsx
<Pressable style={[styles.secondaryActionBtn, { flex: 1 }]} onPress={clearFiltered} disabled={!filteredEquipment.length}>
```

Source line 771:
```tsx
<Pressable style={[styles.secondaryActionBtn, { flex: 1 }]} onPress={() => setShowSelectedOnly((v) => !v)}>
```

Source line 784:
```tsx
<TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter phone number"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
```

Source line 791:
```tsx
<Pressable style={styles.primaryBtn} onPress={findCustomerByPhone}>
```

Source line 797:
```tsx
<DatePickerField value={expectedReturnDate} onChange={setExpectedReturnDate} placeholder="Expected return date" />
```

Source line 798:
```tsx
<TextInput style={styles.input} value={advanceAmount} onChangeText={setAdvanceAmount} placeholder="Advance amount" keyboardType="decimal-pad" />
```

Source line 799:
```tsx
<TextInput style={styles.input} value={remark} onChangeText={setRemark} placeholder="Remark" />
```

Source line 800:
```tsx
<Pressable
            style={styles.primaryBtn}
            onPress={() => {
              if (!selectedItems.length) {
                toast.error("Select at least one product.");
                return;
              }
              if (!customerId) {
                toast.error("Select a customer (search by phone).");
                return;
              }
              createMutation.mutate();
            }}
            disabled={createMutation.isPending}
          >
```

Source line 817:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowCreate(false)}>
```

Source line 825:
```tsx
<Modal visible={showComplete} animationType="slide" transparent onRequestClose={() => setShowComplete(false)}>
```

Source line 872:
```tsx
<TextInput
                    style={styles.input}
                    value={returnDiscount}
                    onChangeText={setReturnDiscount}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
```

Source line 882:
```tsx
<TextInput
                    style={styles.input}
                    value={returnLateFee}
                    onChangeText={setReturnLateFee}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
```

Source line 896:
```tsx
<TextInput
                    style={styles.input}
                    value={returnPaidNow}
                    onChangeText={setReturnPaidNow}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
```

Source line 915:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowComplete(false)}>
```

Source line 918:
```tsx
<Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!targetRentalId) return;
                    completeMutation.mutate({
                      id: targetRentalId,
                      discount: Number(returnDiscount) || 0,
                      paidNow: Number(returnPaidNow) || 0,
                      lateFee: Number(returnLateFee) || 0,
                    });
                  }}
                >
```

Source line 940:
```tsx
<BatchReturnModal
        visible={showBatchComplete}
        rentals={batchReturnRentals}
        equipmentItems={equipmentQuery.data?.items || []}
        title={`Return All - ${batchReturnCustomerId ? customerName(batchReturnCustomerId) : "Customer"}`}
        bottomSpacing={getBottomSpacing(16)}
        isPending={batchCompleteMutation.isPending}
        onClose={() => {
          if (batchCompleteMutation.isPending) return;
          setShowBatchComplete(false);
          setBatchReturnCustomerId(null);
        }}
        onConfirm={({ discount, paidNow, rentalIds, dueDate }) => batchCompleteMutation.mutate({ discount, paidNow, rentalIds, dueDate })}
      />
```

Source line 955:
```tsx
<RentalDetailModal
        visible={showRentalDetails}
        rental={detailRental}
        equipment={detailRental ? equipmentQuery.data?.items.find((e) => e.id === detailRental.equipment_id) : null}
        customer={detailRental ? customerById(detailRental.customer_id) : null}
        bottomSpacing={getBottomSpacing(16)}
        isSaving={editRentalMutation.isPending}
        onClose={() => {
          if (editRentalMutation.isPending) return;
          setShowRentalDetails(false);
          setTargetRentalId(null);
        }}
        onSave={(payload) => {
          if (!detailRental) return;
          editRentalMutation.mutate({ id: detailRental.id, payload });
        }}
        onCall={detailRental ? () => callCustomer(customerById(detailRental.customer_id)?.phone) : undefined}
        onViewInvoice={detailRental ? () => viewRentalInvoice(detailRental) : undefined}
      />
```

Source line 975:
```tsx
<Modal visible={showPayment} animationType="slide" onRequestClose={() => setShowPayment(false)}>
```

Source line 984:
```tsx
<TextInput
                  style={styles.input}
                  value={paymentAmount}
                  onChangeText={(val) => {
                    const numeric = Number(val);
                    if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > dueAmount) {
                      setPaymentAmount(String(dueAmount));
                    } else {
                      setPaymentAmount(val);
                    }
                  }}
                  placeholder="Amount paid"
                  keyboardType="decimal-pad"
                />
```

Source line 1002:
```tsx
<Pressable
            style={styles.primaryBtn}
            onPress={() => {
              if (!targetRentalId) return;
              paymentMutation.mutate({ id: targetRentalId, amountPaid: Number(paymentAmount) || 0 });
            }}
            disabled={paymentMutation.isPending}
          >
```

Source line 1012:
```tsx
<Pressable style={styles.outlineBtn} onPress={() => setShowPayment(false)}>
```

Source line 1020:
```tsx
<Modal visible={showQr} animationType="fade" transparent onRequestClose={() => setShowQr(false)}>
```

Source line 1029:
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

## Conditional behavior

Source line 104:
```tsx
if (!bundleId) return;
```

Source line 160:
```tsx
if (bundles.length === 0) {
      createBundle("Bundle 1");
    }
```

Source line 166:
```tsx
if (!selectedBundleId && bundles.length > 0) {
      setSelectedBundleId(bundles[0].id);
      applyBundleToState(bundles[0]);
    }
```

Source line 174:
```tsx
if (!target) return;
```

Source line 182:
```tsx
if (selectedBundleId === id) {
      const fallback = remaining[0];
      if (fallback) {
        setSelectedBundleId(fallback.id);
        applyBundleToState(fallback);
      } else {
        createBundle("Bundle 1");
      }
    }
```

Source line 184:
```tsx
if (fallback) {
        setSelectedBundleId(fallback.id);
        applyBundleToState(fallback);
      } else {
        createBundle("Bundle 1");
      }
```

Source line 211:
```tsx
if (doneBundle) {
        removeBundle(doneBundle);
      }
```

Source line 234:
```tsx
if (canShowPaymentQr) {
        setLastCompletedRentalId(rental.id);
        setShowQr(true);
      } else {
        navigation.navigate("Invoice", { rentalId: rental.id });
      }
```

Source line 261:
```tsx
if (canShowPaymentQr) {
        setBatchJustCompleted(true);
        setShowQr(true);
      } else {
        navigation.navigate("InvoiceList");
      }
```

Source line 326:
```tsx
if (!phone) {
      toast.warning("No phone number on file for this customer.");
      return;
    }
```

Source line 339:
```tsx
if (!groups[r.customer_id]) {
        groups[r.customer_id] = { customer: customerById(r.customer_id) || { id: r.customer_id, name: `Customer #${r.customer_id}` }, rentals: [] };
      }
```

Source line 349:
```tsx
if (!rentals.length) return;
```

Source line 361:
```tsx
if (showSelectedOnly) return isSelected;
```

Source line 368:
```tsx
if (exists) return prev.filter((p) => p.equipment_id !== id);
```

Source line 382:
```tsx
if (!map.has(id)) map.set(id, "1");
```

Source line 397:
```tsx
if (match) {
        setCustomerId(String(match.id));
        setCustomerFoundLabel(`${match.name} • #${match.id}`);
      } else {
        setCustomerFoundLabel("Not found. Customer must be registered.");
      }
```

Source line 412:
```tsx
if (openRentModal) {
      if (!selectedBundleId && bundles.length) {
        switchBundle(bundles[0].id);
      }
      setShowCreate(true);
      if (equipmentId) {
        toggleSelectItem(equipmentId);
        const equip = equipmentQuery.data?.items.find((e) => e.id === equipmentId);
        if (equip) setRentalSearch(equip.name);
      }
    }
```

Source line 413:
```tsx
if (!selectedBundleId && bundles.length) {
        switchBundle(bundles[0].id);
      }
```

Source line 417:
```tsx
if (equipmentId) {
        toggleSelectItem(equipmentId);
        const equip = equipmentQuery.data?.items.find((e) => e.id === equipmentId);
        if (equip) setRentalSearch(equip.name);
      }
```

Source line 420:
```tsx
if (equip) setRentalSearch(equip.name);
```

Source line 803:
```tsx
if (!selectedItems.length) {
                toast.error("Select at least one product.");
                return;
              }
```

Source line 807:
```tsx
if (!customerId) {
                toast.error("Select a customer (search by phone).");
                return;
              }
```

Source line 921:
```tsx
if (!targetRentalId) return;
```

Source line 948:
```tsx
if (batchCompleteMutation.isPending) return;
```

Source line 963:
```tsx
if (editRentalMutation.isPending) return;
```

Source line 968:
```tsx
if (!detailRental) return;
```

Source line 989:
```tsx
if (val.trim() !== "" && !Number.isNaN(numeric) && numeric > dueAmount) {
                      setPaymentAmount(String(dueAmount));
                    } else {
                      setPaymentAmount(val);
                    }
```

Source line 1005:
```tsx
if (!targetRentalId) return;
```

Source line 1033:
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

Source line 1037:
```tsx
if (batchJustCompleted) {
                  setBatchJustCompleted(false);
                  navigation.navigate("InvoiceList");
                }
```

## Visible text

Source line 444:
```tsx
#
```

Source line 444:
```tsx
·
```

Source line 444:
```tsx
item
```

Source line 479:
```tsx
×
```

Source line 479:
```tsx
· Since
```

Source line 505:
```tsx
Return
```

Source line 563:
```tsx
Paid
```

Source line 565:
```tsx
Due
```

Source line 567:
```tsx
No charge
```

Source line 583:
```tsx
Add Payment
```

Source line 595:
```tsx
Invoice
```

Source line 621:
```tsx
/day
```

Source line 623:
```tsx
Stock:
```

Source line 641:
```tsx
Rentals
```

Source line 661:
```tsx
Ongoing
```

Source line 670:
```tsx
History
```

Source line 710:
```tsx
No active rentals
```

Source line 724:
```tsx
No rental history yet
```

Source line 735:
```tsx
Rental Bundles
```

Source line 745:
```tsx
item(s)
```

Source line 749:
```tsx
Remove
```

Source line 756:
```tsx
+ New Bundle
```

Source line 766:
```tsx
Select All
```

Source line 769:
```tsx
Clear
```

Source line 782:
```tsx
Find Customer by Phone
```

Source line 792:
```tsx
Find
```

Source line 818:
```tsx
Close
```

Source line 830:
```tsx
Receive Return
```

Source line 845:
```tsx
Equipment:
```

Source line 849:
```tsx
Quantity:
```

Source line 853:
```tsx
Rented At:
```

Source line 857:
```tsx
Rental Period:
```

Source line 858:
```tsx
day(s)
```

Source line 862:
```tsx
Estimated Rent:
```

Source line 866:
```tsx
Advance Paid:
```

Source line 871:
```tsx
Discount Amount (INR)
```

Source line 881:
```tsx
Late Fee (INR)
```

Source line 891:
```tsx
Return Revenue (after discount + late fee - advance):
```

Source line 895:
```tsx
Amount Paid Now (INR)
```

Source line 905:
```tsx
Pending Due:
```

Source line 916:
```tsx
Cancel
```

Source line 930:
```tsx
Confirm Return & Pay
```

Source line 978:
```tsx
Update Payment
```

Source line 998:
```tsx
Max:
```

Source line 1013:
```tsx
Close
```

Source line 1023:
```tsx
Payment QR Code
```

Source line 1027:
```tsx
No QR code configured.
```

Source line 1043:
```tsx
Close
```

## Styles

Source line 1052:
```tsx
styles = StyleSheet.create({
  // Header
  h1: { fontSize: 26, fontWeight: "800", color: colors.primary },
  h2: { fontSize: 18, fontWeight: "700", color: colors.primary },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerFilterIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },

  // Pill segment control
  segmentWrap: { marginBottom: 14 },
  segmentTrack: {
    flexDirection: "row",
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.full,
    borderWidth: 1, borderColor: colors.border,
    padding: 4,
  },
  segPill: { flex: 1, paddingVertical: 9, borderRadius: radii.full, alignItems: "center" },
  segPillActive: { backgroundColor: colors.accent, ...shadows.sm },
  segPillText: { fontWeight: "700", fontSize: 14, color: colors.textMuted },
  segPillTextActive: { color: "white" },

  // Date filter row
  filterRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  filterChip: { flex: 1 },
  clearChip: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },

  // Group cards (ongoing)
  meta: { color: colors.textMuted, fontSize: 12 },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 14, gap: 0,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 12,
    ...shadows.sm,
  },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  groupCustomerName: { fontSize: 15, fontWeight: "800", color: colors.primary },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.backgroundTinted,
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: 42, height: 42, borderRadius: 12 },
  avatarInitial: { fontWeight: "800", color: colors.primary, fontSize: 15 },

  // Return All button
  returnAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.accent,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  returnAllBtnText: { color: "white", fontWeight: "800", fontSize: 12 },

  // Rental item row inside group card
  rentalItemRow: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 10, marginTop: 2, gap: 10,
  },
  rentalItemName: { fontSize: 14, fontWeight: "700", color: colors.primary },
  rentalItemRight: { alignItems: "flex-end", gap: 6 },
  rentalItemPrice: { fontSize: 14, fontWeight: "800", color: colors.primary },

  // Return button
  returnBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
    alignItems: "center",
  },
  returnBtnText: { color: "white", fontWeight: "800", fontSize: 12 },

  // History cards
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl, padding: 14, gap: 10,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 10,
    ...shadows.sm,
  },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  historyAmounts: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyAmount: { fontSize: 15, fontWeight: "800", color: colors.primary },
  metaDue: { color: colors.danger, fontWeight: "700" },

  // Status chips
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusChipCompleted: { backgroundColor: colors.successSoft },
  statusChipCancelled: { backgroundColor: colors.backgroundElevated },
  statusChipActive: { backgroundColor: colors.accentSoft },
  statusChipText: { fontSize: 11, fontWeight: "800" },
  statusChipTextCompleted: { color: colors.success },
  statusChipTextCancelled: { color: colors.textMuted },
  statusChipTextActive: { color: colors.accent },

  // Add payment
  addPaymentBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1.5, borderColor: colors.accent,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  addPaymentText: { color: colors.accent, fontWeight: "700", fontSize: 12 },
  historyQuickActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  shareInvoiceMiniBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1.5, borderColor: colors.primaryLight,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  shareInvoiceMiniBtnText: { color: colors.primaryLight, fontWeight: "700", fontSize: 12 },
  callMiniBtn: {
    width: 30, height: 30, borderRadius: 999,
    borderWidth: 1.5, borderColor: colors.success,
    alignItems: "center", justifyContent: "center",
  },
  expectedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  expectedText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  expectedTextOverdue: { color: colors.danger, fontWeight: "800" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyStateText: { color: colors.textMuted, fontSize: 14 },

  // Modals / Bundle
  bundleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  bundleChip: {
    padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", minWidth: 160,
  },
  bundleChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  bundleTitle: { fontWeight: "800", color: colors.primary },
  removeText: { color: colors.danger, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  input: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: 10,
    backgroundColor: colors.backgroundElevated,
    color: colors.textPrimary,
  },
  field: { gap: 6 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.28)", justifyContent: "flex-end" },
  sheetScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface, padding: 20,
    borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, gap: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.primary },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.textSecondary, fontWeight: "700", fontSize: 13 },
  value: { color: colors.textPrimary, fontWeight: "700" },
  boldValue: { color: colors.primary, fontWeight: "800" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  outlineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.lg, alignItems: "center", paddingVertical: 13,
    backgroundColor: colors.backgroundElevated,
  },
  outlineBtnText: { fontWeight: "800", color: colors.textPrimary },
  primaryBtn: {
    flex: 1, backgroundColor: colors.accent,
    borderRadius: radii.lg, alignItems: "center", paddingVertical: 13,
    shadowColor: colors.accent, shadowOpacity: 0.28, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  primaryBtnText: { color: "white", fontWeight: "800" },
  secondaryActionBtn: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, alignItems: "center",
    paddingVertical: 9, paddingHorizontal: 12,
    backgroundColor: colors.backgroundElevated,
  },
  secondaryActionBtnText: { color: colors.textSecondary, fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: 12, gap: 6, marginBottom: 10 },
  tag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  tagSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  tagText: { fontWeight: "700", color: colors.textMuted },
  tagTextSelected: { color: "white" },

  // QR modal
  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 20 },
  qrCard: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, gap: 14, alignItems: "center" },
  qrImage: { width: 240, height: 240, borderRadius: radii.lg, backgroundColor: colors.backgroundElevated },
  qrCloseBtn: {
    minWidth: 160, backgroundColor: colors.accent,
    borderRadius: radii.lg, alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 18,
    shadowColor: colors.accent, shadowOpacity: 0.22, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  qrCloseBtnText: { color: "white", fontWeight: "900", fontSize: 15 },
})
```

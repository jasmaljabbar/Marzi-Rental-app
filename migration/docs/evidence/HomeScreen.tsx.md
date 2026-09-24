# HomeScreen.tsx

Source: `mobile-app/src/screens/HomeScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 82:
```tsx
useState<Customer | null>(null)
```

Source line 83:
```tsx
useState("")
```

Source line 84:
```tsx
useState(false)
```

Source line 85:
```tsx
useState("")
```

Source line 86:
```tsx
useState(false)
```

Source line 87:
```tsx
useState(false)
```

Source line 88:
```tsx
useState("")
```

Source line 89:
```tsx
useState<{ visible: boolean; message: string }>({ visible: false, message: "" })
```

Source line 90:
```tsx
useState<{
    visible: boolean;
    equipmentName: string;
    message: string;
    conflict: ReservationConflict | null;
  }>({ visible: false, equipmentName: "", message: "", conflict: null })
```

Source line 98:
```tsx
useQuery({
    queryKey: ["customers", "home"],
    queryFn: () => customerApi.list({ page: 1, page_size: 200 }),
  })
```

Source line 100:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 103:
```tsx
useQuery({
    queryKey: ["equipment", "home"],
    queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }),
  })
```

Source line 105:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 108:
```tsx
useQuery({
    queryKey: ["categories"],
    queryFn: categoryApi.list,
  })
```

Source line 113:
```tsx
useQuery({
    queryKey: ["customers", "home-phone", phoneSearch],
    queryFn: () => customerApi.list({ page: 1, page_size: 50, search: phoneSearch.trim() || undefined }),
    enabled: phoneSearch.trim().length >= 3,
  })
```

Source line 115:
```tsx
customerApi.list({ page: 1, page_size: 50, search: phoneSearch.trim() || undefined })
```

Source line 119:
```tsx
useQuery({
    queryKey: ["rentals-active", "home"],
    queryFn: () => rentalApi.active({ page: 1, page_size: 200 }),
  })
```

Source line 121:
```tsx
rentalApi.active({ page: 1, page_size: 200 })
```

Source line 127:
```tsx
useQuery({
    queryKey: ["reservations", "home"],
    queryFn: () => reservationApi.list(),
    refetchInterval: 8000,
  })
```

Source line 129:
```tsx
reservationApi.list()
```

Source line 135:
```tsx
useQuery({
    queryKey: ["reservation-notices"],
    queryFn: reservationApi.listNotices,
    refetchInterval: 12000,
  })
```

Source line 141:
```tsx
useMutation({ mutationFn: (id: string) => reservationApi.ackNotice(id) })
```

Source line 141:
```tsx
reservationApi.ackNotice(id)
```

Source line 145:
```tsx
toast.warning(notice.message)
```

Source line 151:
```tsx
useMutation({
    mutationFn: ({ equipmentId, quantity }: { equipmentId: string; quantity: number }) => {
      if (!selectedCustomer) throw new Error("Select a customer before picking items.");
      return reservationApi.upsert(selectedCustomer.id, equipmentId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (err: any, variables) => {
      const conflictErr = err as ReservationConflictError;
      const item = (equipmentQuery.data?.items || []).find((eq) => eq.id === variables.equipmentId);
      if (conflictErr?.status === 409) {
        setConflictModal({
          visible: true,
          equipmentName: item?.name || "This item",
          message: conflictErr.message,
          conflict: conflictErr.conflict || null,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Could not reserve this item.");
      }
    },
  })
```

Source line 154:
```tsx
reservationApi.upsert(selectedCustomer.id, equipmentId, quantity)
```

Source line 157:
```tsx
queryClient.invalidateQueries({ queryKey: ["reservations"] })
```

Source line 170:
```tsx
toast.error(err instanceof Error ? err.message : "Could not reserve this item.")
```

Source line 175:
```tsx
useMutation({
    mutationFn: (reservationId: string) => reservationApi.remove(reservationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reservations"] }),
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not release this item."),
  })
```

Source line 176:
```tsx
reservationApi.remove(reservationId)
```

Source line 177:
```tsx
queryClient.invalidateQueries({ queryKey: ["reservations"] })
```

Source line 178:
```tsx
toast.error(err instanceof Error ? err.message : "Could not release this item.")
```

Source line 181:
```tsx
useMutation({
    mutationFn: ({ reservationId, toCustomerId }: { reservationId: string; toCustomerId: string }) =>
      reservationApi.transfer(reservationId, toCustomerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setConflictModal({ visible: false, equipmentName: "", message: "", conflict: null });
      toast.success("Item transferred to this customer's order.");
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not transfer this reservation."),
  })
```

Source line 183:
```tsx
reservationApi.transfer(reservationId, toCustomerId)
```

Source line 185:
```tsx
queryClient.invalidateQueries({ queryKey: ["reservations"] })
```

Source line 187:
```tsx
toast.success("Item transferred to this customer's order.")
```

Source line 189:
```tsx
toast.error(err instanceof Error ? err.message : "Could not transfer this reservation.")
```

Source line 192:
```tsx
useMutation({
    mutationFn: (customerId: string) => reservationApi.clearForCustomer(customerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reservations"] }),
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not release this draft."),
  })
```

Source line 193:
```tsx
reservationApi.clearForCustomer(customerId)
```

Source line 194:
```tsx
queryClient.invalidateQueries({ queryKey: ["reservations"] })
```

Source line 195:
```tsx
toast.error(err instanceof Error ? err.message : "Could not release this draft.")
```

Source line 259:
```tsx
toast.warning("Select a customer before picking items.")
```

Source line 288:
```tsx
toast.warning("Pick a customer to start a rental.")
```

Source line 289:
```tsx
toast.warning("Choose at least one item to rent.")
```

Source line 304:
```tsx
rootNav.navigate("RentalForm", { customer: selectedCustomer, items })
```

Source line 334:
```tsx
rootNav.navigate("Dashboard", { scrollToAlerts: true })
```

Source line 910:
```tsx
customerApi.create(payload)
```

Source line 914:
```tsx
customersQuery.refetch()
```

Source line 916:
```tsx
toast.error(err instanceof Error ? err.message : "Could not add customer. Please try again.")
```

## Form controls and modal declarations

Source line 330:
```tsx
<Pressable
            style={styles.bellWrap}
            onPress={() => {
              const rootNav = navigation.getParent?.() || navigation;
              rootNav.navigate("Dashboard", { scrollToAlerts: true });
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={alertCount > 0 ? `Alerts, ${alertCount} pending` : "Alerts, none pending"}
          >
```

Source line 348:
```tsx
<Pressable
              style={styles.iconBtn}
              onPress={() => {
                if (activeDraft.length) {
                  setShowClearConfirm(true);
                } else {
                  setSelectedCustomer(null);
                }
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear customer selection"
            >
```

Source line 381:
```tsx
<Pressable
        onPress={() => handleToggleItem(item.id)}
        style={({ pressed }) => [
          styles.card,
          pressed && !isDisabled && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          isSelected && styles.cardSelected,
          isDisabled && styles.cardDisabled,
        ]}
      >
```

Source line 486:
```tsx
<Pressable
                  style={styles.addCustomerBtn}
                  onPress={() => setShowAddCustomer(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add new customer"
                >
```

Source line 510:
```tsx
<TouchableOpacity
                        key={customer.id}
                        style={styles.storyItem}
                        onPress={() => selectCustomer(customer)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={
                          (selected
                            ? `${customer.name}, currently selected`
                            : selectedCustomer
                            ? `Switch to customer ${customer.name}`
                            : `Select customer ${customer.name}`) +
                          (draftCount > 0 ? `, ${draftCount} item${draftCount === 1 ? "" : "s"} in draft` : "")
                        }
                      >
```

Source line 563:
```tsx
<Pressable
              style={styles.searchBar}
              onPress={() => setShowSearchModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Search customer by phone number"
            >
```

Source line 636:
```tsx
<Pressable
                    style={styles.changeCustomerBtn}
                    onPress={() => setShowSearchModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Change customer"
                  >
```

Source line 645:
```tsx
<Pressable
                    style={styles.clearSelectionBtn}
                    onPress={() => {
                      if (activeDraft.length) {
                        setShowClearConfirm(true);
                      } else {
                        setSelectedCustomer(null);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear customer selection"
                  >
```

Source line 677:
```tsx
<TextInput
                  style={styles.inlineInput}
                  placeholder="Search items"
                  placeholderTextColor={c.textMuted}
                  value={equipmentSearch}
                  onChangeText={setEquipmentSearch}
                  {...webInputReset}
                />
```

Source line 731:
```tsx
<Pressable
            style={({ pressed }) => [styles.confirmRentalBtn, pressed && { opacity: 0.9 }]}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={`Confirm rental for ${selectedItemIds.length} items`}
          >
```

Source line 746:
```tsx
<Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
```

Source line 754:
```tsx
<Pressable
              style={styles.modalCloseBtn}
              onPress={() => setShowSearchModal(false)}
              hitSlop={12}
            >
```

Source line 766:
```tsx
<TextInput
                style={styles.modalInput}
                placeholder="Type at least 3 digits"
                placeholderTextColor={c.textMuted}
                keyboardType="phone-pad"
                value={phoneSearch}
                onChangeText={setPhoneSearch}
                autoFocus
                {...webInputReset}
              />
```

Source line 784:
```tsx
<Pressable
                  key={customer.id}
                  style={styles.modalResult}
                  onPress={() => {
                    selectCustomer(customer);
                    setShowSearchModal(false);
                    setPhoneSearch("");
                  }}
                >
```

Source line 818:
```tsx
<Pressable
                    style={styles.addFromSearchBtn}
                    onPress={() => {
                      setPrefillPhone(phoneSearch.trim());
                      setPhoneSearch("");
                      setShowSearchModal(false);
                      setShowAddCustomer(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Add new customer with this phone number"
                  >
```

Source line 840:
```tsx
<Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={() => setShowClearConfirm(false)}>
```

Source line 848:
```tsx
<Pressable style={[styles.dialogBtn, styles.dialogBtnCancel]} onPress={() => setShowClearConfirm(false)} disabled={clearDraftMutation.isPending}>
```

Source line 851:
```tsx
<Pressable
                style={[styles.dialogBtn, styles.dialogBtnDanger, clearDraftMutation.isPending && { opacity: 0.7 }]}
                disabled={clearDraftMutation.isPending}
                onPress={() => {
                  if (!selectedCustomer) {
                    setShowClearConfirm(false);
                    return;
                  }
                  clearDraftMutation.mutate(selectedCustomer.id, {
                    onSuccess: () => {
                      setSelectedCustomer(null);
                      setShowClearConfirm(false);
                    },
                  });
                }}
              >
```

Source line 875:
```tsx
<Modal visible={warningModal.visible} animationType="fade" transparent onRequestClose={() => setWarningModal({ visible: false, message: "" })}>
```

Source line 883:
```tsx
<Pressable
              style={styles.warnOkBtn}
              onPress={() => setWarningModal({ visible: false, message: "" })}
            >
```

Source line 894:
```tsx
<Modal visible={showAddCustomer} animationType="slide" onRequestClose={() => setShowAddCustomer(false)}>
```

Source line 905:
```tsx
<CustomerForm
                title="Add Customer"
                initialValue={prefillPhone ? { phone: prefillPhone } : null}
                onSubmit={async (payload) => {
                  try {
                    const customer = await customerApi.create(payload);
                    setSelectedCustomer(customer);
                    setShowAddCustomer(false);
                    setPrefillPhone("");
                    await customersQuery.refetch();
                  } catch (err: any) {
                    toast.error(err instanceof Error ? err.message : "Could not add customer. Please try again.");
                  }
                }}
                onCancel={() => {
                  setShowAddCustomer(false);
                  setPrefillPhone("");
                }}
              />
```

Source line 931:
```tsx
<ReservationConflictModal
        visible={conflictModal.visible}
        equipmentName={conflictModal.equipmentName}
        targetCustomerName={selectedCustomer?.name || "this customer"}
        message={conflictModal.message}
        conflict={conflictModal.conflict}
        loading={transferReservationMutation.isPending}
        onCancel={() => setConflictModal({ visible: false, equipmentName: "", message: "", conflict: null })}
        onTransfer={() => {
          if (!conflictModal.conflict || !selectedCustomer) return;
          transferReservationMutation.mutate({
            reservationId: conflictModal.conflict.reservation_id,
            toCustomerId: selectedCustomer.id,
          });
        }}
      />
```

## Conditional behavior

Source line 153:
```tsx
if (!selectedCustomer) throw new Error("Select a customer before picking items.");
```

Source line 162:
```tsx
if (conflictErr?.status === 409) {
        setConflictModal({
          visible: true,
          equipmentName: item?.name || "This item",
          message: conflictErr.message,
          conflict: conflictErr.conflict || null,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Could not reserve this item.");
      }
```

Source line 206:
```tsx
if (selectedCustomer && !base.find((c) => c.id === selectedCustomer.id)) {
      return [selectedCustomer, ...base];
    }
```

Source line 214:
```tsx
if (!equipmentSearch.trim()) return items;
```

Source line 245:
```tsx
if (!selectedCustomer || r.customer_id !== selectedCustomer.id) {
        map.set(r.equipment_id, (map.get(r.equipment_id) || 0) + r.quantity);
      }
```

Source line 258:
```tsx
if (!selectedCustomer) {
      toast.warning("Select a customer before picking items.");
      return;
    }
```

Source line 263:
```tsx
if (alreadyInDraft) {
      removeReservationMutation.mutate(alreadyInDraft.id);
      return;
    }
```

Source line 279:
```tsx
if (warning.activeCount) parts.push(`${warning.activeCount} ongoing rental${warning.activeCount > 1 ? "s" : ""}`);
```

Source line 280:
```tsx
if (warning.due > 0) parts.push(`${currency(warning.due)} pending`);
```

Source line 281:
```tsx
if (warning.activeCount || warning.due > 0) {
      setWarningModal({ visible: true, message: `${customer.name} has ${parts.join(" and ")}.` });
    }
```

Source line 288:
```tsx
if (!selectedCustomer) { toast.warning("Pick a customer to start a rental."); return; }
```

Source line 289:
```tsx
if (!activeDraft.length) { toast.warning("Choose at least one item to rent."); return; }
```

Source line 294:
```tsx
if (!item) return null;
```

Source line 318:
```tsx
if (!r.expected_return_date) return false;
```

Source line 351:
```tsx
if (activeDraft.length) {
                  setShowClearConfirm(true);
                } else {
                  setSelectedCustomer(null);
                }
```

Source line 452:
```tsx
if (route.params?.resetToken) {
      setSelectedCustomer(null);
    }
```

Source line 458:
```tsx
if (route.params?.focusEquipmentName) {
      setEquipmentSearch(route.params.focusEquipmentName);
    }
```

Source line 614:
```tsx
if (!risk.activeCount && risk.due <= 0) return null;
```

Source line 648:
```tsx
if (activeDraft.length) {
                        setShowClearConfirm(true);
                      } else {
                        setSelectedCustomer(null);
                      }
```

Source line 855:
```tsx
if (!selectedCustomer) {
                    setShowClearConfirm(false);
                    return;
                  }
```

Source line 940:
```tsx
if (!conflictModal.conflict || !selectedCustomer) return;
```

## Visible text

Source line 402:
```tsx
/day
```

Source line 408:
```tsx
LOW
```

Source line 423:
```tsx
Out of Stock
```

Source line 439:
```tsx
in stock
```

Source line 442:
```tsx
reserved by another order
```

Source line 485:
```tsx
CUSTOMERS
```

Source line 570:
```tsx
Search by phone number
```

Source line 601:
```tsx
item
```

Source line 607:
```tsx
Selected
```

Source line 621:
```tsx
ongoing rental
```

Source line 628:
```tsx
due
```

Source line 643:
```tsx
Change customer
```

Source line 658:
```tsx
Clear
```

Source line 665:
```tsx
No customer selected
```

Source line 667:
```tsx
Tap a customer above to begin a new rental booking.
```

Source line 674:
```tsx
RENTAL INVENTORY
```

Source line 689:
```tsx
Tap a card to add
```

Source line 696:
```tsx
Selected items are reserved for
```

Source line 696:
```tsx
only — stock isn't deducted until the rental is confirmed.
```

Source line 710:
```tsx
No items found
```

Source line 723:
```tsx
item
```

Source line 723:
```tsx
selected
```

Source line 728:
```tsx
est. / day
```

Source line 739:
```tsx
Confirm Rental (
```

Source line 739:
```tsx
)
```

Source line 753:
```tsx
Search customer
```

Source line 763:
```tsx
Phone number
```

Source line 817:
```tsx
No customer found for "
```

Source line 817:
```tsx
"
```

Source line 830:
```tsx
Add New Customer
```

Source line 843:
```tsx
Release this draft?
```

Source line 845:
```tsx
This releases all
```

Source line 845:
```tsx
reserved item
```

Source line 845:
```tsx
for
```

Source line 845:
```tsx
— they become available to other customers' orders right away.
```

Source line 849:
```tsx
Keep
```

Source line 881:
```tsx
Heads up
```

Source line 887:
```tsx
Got it
```

## Styles

Source line 73:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

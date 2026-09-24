# CustomersScreen.tsx

Source: `mobile-app/src/screens/CustomersScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 33:
```tsx
useState("")
```

Source line 34:
```tsx
useState(false)
```

Source line 35:
```tsx
useState<Customer | null>(null)
```

Source line 36:
```tsx
useState<string | null>(null)
```

Source line 38:
```tsx
useQuery({
    queryKey: ["customers", search],
    queryFn: () => customerApi.list({ page: 1, page_size: 200, search: search || undefined }),
  })
```

Source line 40:
```tsx
customerApi.list({ page: 1, page_size: 200, search: search || undefined })
```

Source line 42:
```tsx
useQuery({ queryKey: ["rentals-active", "customers-screen"], queryFn: () => rentalApi.active({ page: 1, page_size: 200 }) })
```

Source line 42:
```tsx
rentalApi.active({ page: 1, page_size: 200 })
```

Source line 43:
```tsx
useQuery({ queryKey: ["rentals-history", "customers-screen"], queryFn: () => rentalApi.history({ page: 1, page_size: 200 }) })
```

Source line 43:
```tsx
rentalApi.history({ page: 1, page_size: 200 })
```

Source line 65:
```tsx
useMutation({
    mutationFn: async (payload: {
      name: string;
      phone: string;
      address: string | null;
      doc_url: string | null;
      photo_url: string | null;
    }) => {
      if (editing) return customerApi.update(editing.id, payload);
      return customerApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Customer updated!" : "Customer saved!");
      setShowModal(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save customer.");
    },
  })
```

Source line 73:
```tsx
customerApi.update(editing.id, payload)
```

Source line 74:
```tsx
customerApi.create(payload)
```

Source line 77:
```tsx
toast.success(editing ? "Customer updated!" : "Customer saved!")
```

Source line 80:
```tsx
queryClient.invalidateQueries({ queryKey: ["customers"] })
```

Source line 83:
```tsx
toast.error(err instanceof Error ? err.message : "Failed to save customer.")
```

Source line 87:
```tsx
useMutation({
    mutationFn: customerApi.remove,
    onSuccess: () => {
      toast.success("Customer deleted.");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer.");
    },
  })
```

Source line 90:
```tsx
toast.success("Customer deleted.")
```

Source line 91:
```tsx
queryClient.invalidateQueries({ queryKey: ["customers"] })
```

Source line 94:
```tsx
toast.error(err instanceof Error ? err.message : "Failed to delete customer.")
```

Source line 169:
```tsx
navigation.navigate("CustomerDetail", { customerId: item.id })
```

## Form controls and modal declarations

Source line 116:
```tsx
<AddButton
          label="New"
          onPress={openAddModal}
        />
```

Source line 130:
```tsx
<TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone"
          placeholderTextColor={colors.textMuted}
        />
```

Source line 138:
```tsx
<Pressable
            onPress={() => setSearch("")}
            style={styles.clearBtn}
            accessibilityLabel="Clear search"
          >
```

Source line 167:
```tsx
<Pressable
              style={styles.cardNavigable}
              onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}
            >
```

Source line 214:
```tsx
<Pressable
                style={styles.editBadge}
                onPress={() => {
                  setEditing(item);
                  setShowModal(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit customer ${item.name}`}
              >
```

Source line 225:
```tsx
<Pressable
                style={styles.deleteBtn}
                onPress={() => setConfirmDeleteId(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete customer ${item.name}`}
              >
```

Source line 255:
```tsx
<Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
```

Source line 258:
```tsx
<CustomerForm
              title={editing ? "Edit Customer" : "Add Customer"}
              initialValue={editing ?? emptyCustomer}
              isSubmitting={saveMutation.isPending}
              onSubmit={(payload) => saveMutation.mutateAsync(payload)}
              onCancel={() => setShowModal(false)}
            />
```

## Conditional behavior

Source line 52:
```tsx
if (r.expected_return_date && new Date(r.expected_return_date).getTime() < now) entry.overdueCount += 1;
```

Source line 56:
```tsx
if ((r.amount_due || 0) > 0) {
        const entry = get(r.customer_id);
        entry.due += r.amount_due || 0;
        map.set(r.customer_id, entry);
      }
```

Source line 73:
```tsx
if (editing) return customerApi.update(editing.id, payload);
```

Source line 248:
```tsx
if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
```

## Visible text

Source line 111:
```tsx
Customers
```

Source line 113:
```tsx
customers
```

Source line 195:
```tsx
overdue
```

Source line 199:
```tsx
active
```

Source line 204:
```tsx
due
```

Source line 223:
```tsx
Edit
```

## Styles

Source line 273:
```tsx
styles = StyleSheet.create({
  modalRoot: { flex: 1 },

  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  h1: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
  },
  countPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  countPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  /* Search Bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  clearBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },

  /* List */
  listContainer: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },

  /* Customer Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  cardNavigable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  /* Avatar */
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
  },

  /* Card Info */
  cardInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  cardName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  cardPhone: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  statusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  statusChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusChipInfo: { backgroundColor: colors.infoSoft },
  statusChipInfoText: { color: colors.info, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  statusChipDanger: { backgroundColor: colors.dangerSoft },
  statusChipDangerText: { color: colors.danger, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  statusChipWarning: { backgroundColor: colors.warningSoft },
  statusChipWarningText: { color: colors.warningDark, fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },

  /* Actions */
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  editBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  editBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
})
```

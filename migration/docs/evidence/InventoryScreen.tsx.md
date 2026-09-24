# InventoryScreen.tsx

Source: `mobile-app/src/screens/InventoryScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 38:
```tsx
useState("")
```

Source line 39:
```tsx
useState<string>("all")
```

Source line 40:
```tsx
useState(false)
```

Source line 41:
```tsx
useState(false)
```

Source line 42:
```tsx
useState("")
```

Source line 43:
```tsx
useState("")
```

Source line 44:
```tsx
useState("")
```

Source line 45:
```tsx
useState(false)
```

Source line 46:
```tsx
useState<{ id: string; name: string; unitPrice: number } | null>(null)
```

Source line 47:
```tsx
useState("1")
```

Source line 48:
```tsx
useState("0")
```

Source line 49:
```tsx
useState("")
```

Source line 51:
```tsx
useQuery({
    queryKey: ["equipment", search, categoryId],
    queryFn: () =>
      equipmentApi.list({
        page: 1,
        page_size: 200,
        search: search || undefined,
        category_id: categoryId === "all" ? undefined : categoryId,
      }),
  })
```

Source line 54:
```tsx
equipmentApi.list({
        page: 1,
        page_size: 200,
        search: search || undefined,
        category_id: categoryId === "all" ? undefined : categoryId,
      })
```

Source line 62:
```tsx
useQuery({ queryKey: ["categories"], queryFn: categoryApi.list })
```

Source line 64:
```tsx
useMutation({
    mutationFn: async (payload: Partial<Equipment>) => equipmentApi.create(payload),
    onSuccess: () => {
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) =>
      toast.error(err instanceof Error ? err.message : "Unable to add equipment"),
  })
```

Source line 65:
```tsx
equipmentApi.create(payload)
```

Source line 68:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 69:
```tsx
queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
```

Source line 70:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 73:
```tsx
toast.error(err instanceof Error ? err.message : "Unable to add equipment")
```

Source line 76:
```tsx
useMutation({
    mutationFn: () => {
      if (!stockTarget) throw new Error("No target selected");
      return equipmentApi.addStock(
        stockTarget.id,
        Number(stockQty) || 0,
        Number(stockUnitPrice) || 0,
        stockNote || undefined,
      );
    },
    onSuccess: () => {
      setShowStockModal(false);
      setStockTarget(null);
      setStockQty("1");
      setStockUnitPrice("0");
      setStockNote("");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) =>
      toast.error(err instanceof Error ? err.message : "Unable to add stock"),
  })
```

Source line 79:
```tsx
equipmentApi.addStock(
        stockTarget.id,
        Number(stockQty) || 0,
        Number(stockUnitPrice) || 0,
        stockNote || undefined,
      )
```

Source line 92:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 93:
```tsx
queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
```

Source line 94:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 97:
```tsx
toast.error(err instanceof Error ? err.message : "Unable to add stock")
```

Source line 100:
```tsx
useMutation({
    mutationFn: () => categoryApi.create(newCategoryName.trim()),
    onSuccess: async (category) => {
      setCategoryId(String(category.id));
      setNewCategoryName("");
      setCategoryError("");
      setShowCategoryModal(false);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      setCategoryError(error instanceof Error ? error.message : "Unable to add category.");
    },
  })
```

Source line 101:
```tsx
categoryApi.create(newCategoryName.trim())
```

Source line 105:
```tsx
setCategoryError("")
```

Source line 107:
```tsx
queryClient.invalidateQueries({ queryKey: ["categories"] })
```

Source line 110:
```tsx
setCategoryError(error instanceof Error ? error.message : "Unable to add category.")
```

Source line 151:
```tsx
navigation.navigate("EquipmentDetail", { equipmentId: item.id })
```

Source line 214:
```tsx
navigation.navigate("MainTabs", { screen: "Home", params: { focusEquipmentName: item.name } })
```

Source line 435:
```tsx
setCategoryError("")
```

## Form controls and modal declarations

Source line 149:
```tsx
<Pressable
        style={styles.card}
        onPress={() => navigation.navigate("EquipmentDetail", { equipmentId: item.id })}
      >
```

Source line 209:
```tsx
<Pressable
              style={[styles.rentBtn, available <= 0 && styles.rentBtnDisabled]}
              disabled={available <= 0}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("MainTabs", { screen: "Home", params: { focusEquipmentName: item.name } });
              }}
              accessibilityRole="button"
              accessibilityLabel={available <= 0 ? `${item.name} is out of stock` : `Rent ${item.name}`}
            >
```

Source line 222:
```tsx
<Pressable
              style={styles.addStockIconBtn}
              onPress={(e) => {
                e.stopPropagation();
                openStockModal(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add stock for ${item.name}`}
              hitSlop={6}
            >
```

Source line 245:
```tsx
<AddButton label="Add" onPress={() => setShowAddModal(true)} />
```

Source line 258:
```tsx
<TextInput
            style={styles.searchInput}
            placeholder="Search equipment..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
```

Source line 267:
```tsx
<Pressable onPress={() => setSearch("")} style={styles.clearBtn} hitSlop={8}>
```

Source line 275:
```tsx
<Pressable style={styles.categoryDropdown} onPress={() => setShowCategoryModal(true)}>
```

Source line 320:
```tsx
<Modal
        visible={showAddModal}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
```

Source line 327:
```tsx
<EquipmentForm
              title="Add Equipment"
              initialValue={{ stock_count: 1, rent_per_day: 0, purchase_price_per_unit: 0, images: [] }}
              isSubmitting={saveMutation.isPending}
              onSubmit={(payload) => saveMutation.mutateAsync(payload)}
              onCancel={() => setShowAddModal(false)}
            />
```

Source line 340:
```tsx
<Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
```

Source line 351:
```tsx
<Pressable onPress={() => setShowCategoryModal(false)} hitSlop={8}>
```

Source line 358:
```tsx
<TextInput
                style={styles.catSearchInput}
                placeholder="Search categories..."
                placeholderTextColor={colors.textMuted}
                value={categorySearch}
                onChangeText={setCategorySearch}
              />
```

Source line 366:
```tsx
<Pressable onPress={() => setCategorySearch("")} hitSlop={8}>
```

Source line 379:
```tsx
<Pressable
                    style={[styles.catOption, categoryId === "all" && styles.catOptionActive]}
                    onPress={() => {
                      setCategoryId("all");
                      setShowCategoryModal(false);
                    }}
                  >
```

Source line 401:
```tsx
<Pressable
                  style={[styles.catOption, String(cat.id) === categoryId && styles.catOptionActive]}
                  onPress={() => {
                    setCategoryId(String(cat.id));
                    setShowCategoryModal(false);
                  }}
                >
```

Source line 428:
```tsx
<TextInput
                style={styles.catAddInput}
                placeholder="Add new category"
                placeholderTextColor={colors.textMuted}
                value={newCategoryName}
                onChangeText={(v) => {
                  setNewCategoryName(v);
                  setCategoryError("");
                }}
              />
```

Source line 438:
```tsx
<Pressable
                style={[styles.catAddBtn, !newCategoryName.trim() && styles.catAddBtnDisabled]}
                onPress={() => categoryCreateMutation.mutate()}
                disabled={!newCategoryName.trim() || categoryCreateMutation.isPending}
              >
```

Source line 452:
```tsx
<Modal
        visible={showStockModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowStockModal(false)}
      >
```

Source line 476:
```tsx
<Pressable onPress={() => setShowStockModal(false)} hitSlop={8}>
```

Source line 483:
```tsx
<Input
                label="Quantity"
                value={stockQty}
                onChangeText={setStockQty}
                placeholder="Enter quantity"
                keyboardType="numeric"
                leftIcon={
                  <MaterialCommunityIcons name="counter" size={18} color={colors.textMuted} />
                }
              />
```

Source line 494:
```tsx
<Input
                label="Unit Price (INR)"
                value={stockUnitPrice}
                onChangeText={setStockUnitPrice}
                placeholder="Enter unit price"
                keyboardType="decimal-pad"
                leftIcon={
                  <MaterialCommunityIcons name="currency-inr" size={18} color={colors.textMuted} />
                }
              />
```

Source line 505:
```tsx
<Input
                label="Note (optional)"
                value={stockNote}
                onChangeText={setStockNote}
                placeholder="Add a note..."
                leftIcon={
                  <MaterialCommunityIcons name="note-outline" size={18} color={colors.textMuted} />
                }
              />
```

Source line 536:
```tsx
<Button
                variant="secondary"
                size="md"
                onPress={() => setShowStockModal(false)}
                style={styles.stockBtnHalf}
                disabled={stockMutation.isPending}
              >
```

Source line 545:
```tsx
<Button
                variant="primary"
                size="md"
                loading={stockMutation.isPending}
                onPress={() => stockMutation.mutate()}
                style={styles.stockBtnHalf}
              >
```

## Conditional behavior

Source line 78:
```tsx
if (!stockTarget) throw new Error("No target selected");
```

Source line 116:
```tsx
if (!categorySearch.trim()) return categories;
```

## Visible text

Source line 169:
```tsx
/day
```

Source line 197:
```tsx
in stock
```

Source line 202:
```tsx
damaged
```

Source line 244:
```tsx
Equipment Inventory
```

Source line 350:
```tsx
Filter by Category
```

Source line 392:
```tsx
All Categories
```

Source line 422:
```tsx
No categories match "
```

Source line 422:
```tsx
".
```

Source line 468:
```tsx
Add Stock
```

Source line 520:
```tsx
Qty × Unit Price
```

Source line 522:
```tsx
×
```

Source line 526:
```tsx
Total Cost
```

Source line 543:
```tsx
Cancel
```

Source line 552:
```tsx
Save Stock
```

## Styles

Source line 564:
```tsx
styles = StyleSheet.create({
  /* ─── Header ─── */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    flex: 1,
    marginRight: spacing.md,
  },

  /* ─── Filter card ─── */
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    height: "100%",
  },
  clearBtn: {
    padding: spacing.xxs,
  },
  filterBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryDropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.backgroundTinted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryDropdownText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  costPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  costPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.info,
  },

  /* ─── Grid ─── */
  gridContent: {
    gap: spacing.md,
  },
  gridRow: {
    gap: spacing.md,
  },

  /* ─── Equipment card ─── */
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.md,
  },
  cardImageWrap: {
    height: 130,
    position: "relative",
    backgroundColor: colors.backgroundTinted,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundTinted,
  },
  priceChip: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  priceChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  categoryChip: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: "70%",
  },
  categoryChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    lineHeight: typography.sizes.sm * 1.4,
  },
  cardDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    lineHeight: typography.sizes.xs * 1.5,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  stockBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.info,
  },
  damagedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  damagedBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
  cardActionsRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  rentBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  rentBtnDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  rentBtnText: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  addStockIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ─── Modal overlay ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },

  /* ─── Category sheet ─── */
  catSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  catSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  catSheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  catOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  catOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  catOptionText: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  catOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  catCheck: {
    marginLeft: "auto",
  },
  catSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.sm,
  },
  catSearchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    height: "100%",
  },
  catEmptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  catAddRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  catAddInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  catAddBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  catAddBtnDisabled: {
    opacity: 0.5,
  },
  categoryErrorText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },

  /* ─── Stock modal ─── */
  stockModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  stockModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  stockModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  stockModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stockModalTitleTextWrap: {
    flex: 1,
  },
  stockModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  stockModalSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  stockFieldsWrap: {
    gap: spacing.xxs,
  },
  stockSummaryCard: {
    backgroundColor: colors.backgroundTinted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stockSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockSummaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  stockSummaryValue: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  stockSummaryTotalRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stockSummaryTotalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  stockSummaryTotalValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
  },
  stockBtnRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  stockBtnHalf: {
    flex: 1,
  },
})
```

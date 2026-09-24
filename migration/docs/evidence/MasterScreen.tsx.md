# MasterScreen.tsx

Source: `mobile-app/src/screens/MasterScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 17:
```tsx
useState("")
```

Source line 18:
```tsx
useState("")
```

Source line 19:
```tsx
useState<{ id: string; name: string } | null>(null)
```

Source line 21:
```tsx
useQuery({ queryKey: ["categories"], queryFn: categoryApi.list })
```

Source line 22:
```tsx
useQuery({ queryKey: ["equipment", "master"], queryFn: () => equipmentApi.list({ page: 1, page_size: 500 }) })
```

Source line 22:
```tsx
equipmentApi.list({ page: 1, page_size: 500 })
```

Source line 31:
```tsx
useMutation({
    mutationFn: () => categoryApi.create(name.trim()),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) =>
      toast.error(error instanceof Error ? error.message : "Unable to add category"),
  })
```

Source line 32:
```tsx
categoryApi.create(name.trim())
```

Source line 35:
```tsx
queryClient.invalidateQueries({ queryKey: ["categories"] })
```

Source line 38:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to add category")
```

Source line 41:
```tsx
useMutation({
    mutationFn: categoryApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (error: any) =>
      toast.error(error instanceof Error ? error.message : "Unable to delete category"),
  })
```

Source line 43:
```tsx
queryClient.invalidateQueries({ queryKey: ["categories"] })
```

Source line 45:
```tsx
toast.error(error instanceof Error ? error.message : "Unable to delete category")
```

Source line 58:
```tsx
toast.error("Please enter a category name.")
```

Source line 193:
```tsx
toast.warning(
                        `"${item.name}" is used by ${itemCount} equipment item${itemCount === 1 ? "" : "s"}. Reassign them to another category from Inventory before deleting.`,
                      )
```

## Form controls and modal declarations

Source line 105:
```tsx
<Input
          value={name}
          onChangeText={setName}
          placeholder="Enter category name"
          leftIcon={
            <MaterialCommunityIcons name="shape-outline" size={18} color={colors.textMuted} />
          }
        />
```

Source line 114:
```tsx
<Button
          variant="primary"
          size="md"
          loading={addMutation.isPending}
          disabled={!name.trim()}
          onPress={handleAdd}
          leftIcon={<MaterialCommunityIcons name="plus" size={18} color={colors.textInverse} />}
        >
```

Source line 145:
```tsx
<TextInput
            style={styles.searchInput}
            placeholder="Search categories"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
```

Source line 153:
```tsx
<Pressable onPress={() => setSearch("")} hitSlop={8}>
```

Source line 189:
```tsx
<Pressable
                  style={styles.deleteBtn}
                  onPress={() => {
                    if (itemCount > 0) {
                      toast.warning(
                        `"${item.name}" is used by ${itemCount} equipment item${itemCount === 1 ? "" : "s"}. Reassign them to another category from Inventory before deleting.`,
                      );
                      return;
                    }
                    setConfirmDeleteCategory({ id: item.id, name: item.name });
                  }}
                >
```

## Conditional behavior

Source line 51:
```tsx
if (!search.trim()) return categories;
```

Source line 57:
```tsx
if (!name.trim()) {
      toast.error("Please enter a category name.");
      return;
    }
```

Source line 192:
```tsx
if (itemCount > 0) {
                      toast.warning(
                        `"${item.name}" is used by ${itemCount} equipment item${itemCount === 1 ? "" : "s"}. Reassign them to another category from Inventory before deleting.`,
                      );
                      return;
                    }
```

Source line 218:
```tsx
if (confirmDeleteCategory) deleteMutation.mutate(confirmDeleteCategory.id);
```

## Visible text

Source line 70:
```tsx
Category Master
```

Source line 72:
```tsx
Keep your master category list clean, searchable, and easy to update.
```

Source line 84:
```tsx
Total categories
```

Source line 88:
```tsx
Visible now
```

Source line 96:
```tsx
Add New Category
```

Source line 98:
```tsx
Master data
```

Source line 102:
```tsx
Use short, clear names so inventory and reports stay organized.
```

Source line 122:
```tsx
Add Category
```

Source line 129:
```tsx
Category List
```

Source line 132:
```tsx
item
```

Source line 202:
```tsx
Delete
```

## Styles

Source line 227:
```tsx
styles = StyleSheet.create({
  /* ─── Hero card ─── */
  heroCard: {
    backgroundColor: colors.backgroundTinted,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: typography.lineHeights.sm,
    marginTop: spacing.xs,
  },
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  heroStatValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.primaryDark,
  },
  heroStatLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },

  /* ─── Section cards ─── */
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
    color: colors.primaryDark,
  },
  sectionHelp: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: typography.lineHeights.sm,
    marginTop: -spacing.xs,
  },

  /* ─── Pills ─── */
  masterPill: {
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  masterPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    color: colors.info,
  },
  countPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  countPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },

  /* ─── Search bar ─── */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    height: "100%",
  },

  /* ─── Category rows ─── */
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  avatarBubble: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.primaryLight,
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  categoryMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    color: colors.danger,
  },
})
```

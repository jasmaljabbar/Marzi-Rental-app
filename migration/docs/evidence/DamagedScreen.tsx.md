# DamagedScreen.tsx

Source: `mobile-app/src/screens/DamagedScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 16:
```tsx
useState<{ id: string; name: string } | null>(null)
```

Source line 17:
```tsx
useState("0")
```

Source line 18:
```tsx
useState("")
```

Source line 20:
```tsx
useQuery({
    queryKey: ["equipment", "damaged"],
    queryFn: () => equipmentApi.list({ page: 1, page_size: 200 }),
  })
```

Source line 22:
```tsx
equipmentApi.list({ page: 1, page_size: 200 })
```

Source line 24:
```tsx
useQuery({ queryKey: ["customers", "damaged"], queryFn: () => customerApi.list({ page: 1, page_size: 200 }) })
```

Source line 24:
```tsx
customerApi.list({ page: 1, page_size: 200 })
```

Source line 30:
```tsx
useMutation({
    mutationFn: ({ id, cost, remark }: { id: string; cost: number; remark: string }) =>
      equipmentApi.maintenance(id, "Repair", remark || "Repair from damaged list", cost),
    onSuccess: () => {
      setRepairTarget(null);
      setRepairCost("0");
      setRepairRemark("");
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not mark this item as repaired."),
  })
```

Source line 32:
```tsx
equipmentApi.maintenance(id, "Repair", remark || "Repair from damaged list", cost)
```

Source line 37:
```tsx
queryClient.invalidateQueries({ queryKey: ["equipment"] })
```

Source line 38:
```tsx
queryClient.invalidateQueries({ queryKey: ["expenses"] })
```

Source line 40:
```tsx
toast.error(err instanceof Error ? err.message : "Could not mark this item as repaired.")
```

## Form controls and modal declarations

Source line 89:
```tsx
<Pressable
            style={({ pressed }) => [styles.repairBtn, pressed && styles.repairBtnPressed]}
            onPress={() => {
              setRepairTarget({ id: item.id, name: item.name });
              setRepairCost("0");
              setRepairRemark("");
            }}
            accessibilityRole="button"
            accessibilityLabel={`Mark one unit of ${item.name} as repaired`}
          >
```

Source line 148:
```tsx
<Modal visible={repairTarget !== null} transparent animationType="fade" onRequestClose={() => setRepairTarget(null)}>
```

Source line 155:
```tsx
<TextInput
              style={styles.repairInput}
              value={repairCost}
              onChangeText={setRepairCost}
              placeholder="0"
              keyboardType="decimal-pad"
            />
```

Source line 167:
```tsx
<TextInput
              style={styles.repairInput}
              value={repairRemark}
              onChangeText={setRepairRemark}
              placeholder="What was fixed?"
            />
```

Source line 175:
```tsx
<Pressable style={styles.repairCancelBtn} onPress={() => setRepairTarget(null)} disabled={repairMutation.isPending}>
```

Source line 178:
```tsx
<Pressable
                style={styles.repairConfirmBtn}
                disabled={repairMutation.isPending}
                onPress={() => {
                  if (!repairTarget) return;
                  repairMutation.mutate({ id: repairTarget.id, cost: Number(repairCost) || 0, remark: repairRemark.trim() });
                }}
              >
```

## Conditional behavior

Source line 26:
```tsx
if (!id) return null;
```

Source line 182:
```tsx
if (!repairTarget) return;
```

## Visible text

Source line 63:
```tsx
damaged unit
```

Source line 68:
```tsx
Est. cost
```

Source line 70:
```tsx
Reported during return —
```

Source line 100:
```tsx
Repair
```

Source line 114:
```tsx
Damaged Items
```

Source line 116:
```tsx
Review units needing repair and mark them as fixed when ready.
```

Source line 126:
```tsx
item
```

Source line 126:
```tsx
need attention
```

Source line 142:
```tsx
No damaged items
```

Source line 143:
```tsx
All equipment is in good condition right now.
```

Source line 151:
```tsx
Mark as Repaired
```

Source line 152:
```tsx
Repair one unit of "
```

Source line 152:
```tsx
"?
```

Source line 154:
```tsx
Repair cost (optional)
```

Source line 163:
```tsx
Entering a cost logs it as an expense so profit reports stay accurate.
```

Source line 166:
```tsx
Note (optional)
```

Source line 176:
```tsx
Cancel
```

## Styles

Source line 196:
```tsx
styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: spacing.xs,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroText: { flex: 1, gap: spacing.xs },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  h1: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.primaryDark,
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  heroStat: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  heroStatValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.danger,
  },
  heroStatLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },

  list: { gap: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { flex: 1, gap: spacing.xxs },
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  damagedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  damagedBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },

  repairBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    minHeight: 44,
  },
  repairBtnPressed: { opacity: 0.75 },
  repairBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },

  damageDetails: { marginTop: spacing.xs, gap: 2 },
  damageDetailText: { fontSize: typography.sizes.xs, color: colors.textSecondary },
  damageDetailLink: { fontSize: typography.sizes.xs, color: colors.info, fontWeight: typography.weights.semibold },
  damageDetailMeta: { fontSize: typography.sizes.xs, color: colors.textMuted },
  damagePhotoRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  damagePhotoThumb: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.backgroundElevated },

  // Repair modal
  repairOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  repairCard: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.sm, ...shadows.lg },
  repairTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary },
  repairSubtitle: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  repairFieldLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.textSecondary },
  repairInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.backgroundElevated, color: colors.textPrimary },
  repairHint: { fontSize: typography.sizes.xs, color: colors.textMuted, marginTop: -spacing.xxs },
  repairActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  repairCancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  repairCancelText: { color: colors.textSecondary, fontWeight: typography.weights.semibold },
  repairConfirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: "center", backgroundColor: colors.success },
  repairConfirmText: { color: "white", fontWeight: typography.weights.bold },

  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxxxl,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
})
```

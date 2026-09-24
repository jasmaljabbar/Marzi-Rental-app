# ConfirmDialog.tsx

Source: `mobile-app/src/components/ConfirmDialog.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 28:
```tsx
<Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
```

Source line 34:
```tsx
<Pressable style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
```

Source line 37:
```tsx
<Pressable
              style={[styles.confirmBtn, danger && styles.confirmDangerBtn]}
              onPress={onConfirm}
              disabled={loading}
            >
```

## Conditional behavior

## Visible text

## Styles

Source line 55:
```tsx
styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
    ...shadows.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  message: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  confirmDangerBtn: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: "white",
  },
})
```

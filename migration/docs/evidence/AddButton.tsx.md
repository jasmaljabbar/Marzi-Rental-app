# AddButton.tsx

Source: `mobile-app/src/components/AddButton.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 13:
```tsx
<Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
```

## Conditional behavior

## Visible text

## Styles

Source line 27:
```tsx
styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.textInverse,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.sm,
    letterSpacing: 0.2,
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.88 },
})
```

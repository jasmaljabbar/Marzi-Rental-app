# Button.tsx

Source: `mobile-app/src/components/ui/Button.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 112:
```tsx
<Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={isDisabled ? undefined : handlePressIn}
        onPressOut={isDisabled ? undefined : handlePressOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.base,
          containerVariantStyles[variant],
          { paddingVertical, paddingHorizontal },
          isDisabled && styles.disabled,
        ]}
      >
```

## Conditional behavior

## Visible text

## Styles

Source line 153:
```tsx
styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    // inherits opacity from parent
  },
})
```

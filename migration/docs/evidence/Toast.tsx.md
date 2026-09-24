# Toast.tsx

Source: `mobile-app/src/components/ui/Toast.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 134:
```tsx
<Pressable
        onPress={() => dismiss()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        style={styles.closeBtn}
      >
```

## Conditional behavior

Source line 86:
```tsx
if (finished && onDismiss) {
        runOnJS(onDismiss)();
      }
```

Source line 93:
```tsx
if (visible) {
      // Slide in
      translateY.value = withSpring(0, { damping: 20, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 220 });

      // Auto-dismiss
      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      dismiss();
    }
```

## Visible text

## Styles

Source line 149:
```tsx
styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.md,
    zIndex: 300,
  },
  icon: {
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.sm,
  },
  closeBtn: {
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
})
```

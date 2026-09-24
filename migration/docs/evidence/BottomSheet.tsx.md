# BottomSheet.tsx

Source: `mobile-app/src/components/ui/BottomSheet.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 115:
```tsx
<Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
```

Source line 128:
```tsx
<Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
```

Source line 144:
```tsx
<Pressable
                onPress={handleClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                style={styles.closeBtn}
              >
```

## Conditional behavior

Source line 76:
```tsx
if (finished) runOnJS(onDone)();
```

Source line 89:
```tsx
if (visible) {
      // Reset position before animating in (important if modal was already open)
      translateY.value = 500;
      animateIn();
    }
```

Source line 98:
```tsx
if (!visible) return;
```

## Visible text

Source line 151:
```tsx
✕
```

## Styles

Source line 172:
```tsx
styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingBottom: spacing.xxxxl,
    ...shadows.xl,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  closeBtn: {
    marginLeft: spacing.sm,
  },
  closeText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
})
```

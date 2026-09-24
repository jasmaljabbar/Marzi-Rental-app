# Card.tsx

Source: `mobile-app/src/components/ui/Card.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 47:
```tsx
<Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          style={containerStyle}
        >
```

## Conditional behavior

Source line 44:
```tsx
if (isPressable) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          style={containerStyle}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }
```

## Visible text

## Styles

Source line 65:
```tsx
styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    padding: spacing.lg,
    overflow: 'hidden',
  },
})
```

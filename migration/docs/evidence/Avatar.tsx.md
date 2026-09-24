# Avatar.tsx

Source: `mobile-app/src/components/ui/Avatar.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

## Conditional behavior

Source line 75:
```tsx
if (parts.length === 0) return '?';
```

Source line 76:
```tsx
if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
```

## Visible text

## Styles

Source line 142:
```tsx
styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatarBase: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: ONLINE_COLOR,
    borderWidth: 2,
    borderColor: colors.surface,
  },
})
```

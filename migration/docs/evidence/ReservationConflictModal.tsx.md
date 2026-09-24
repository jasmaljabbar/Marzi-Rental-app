# ReservationConflictModal.tsx

Source: `mobile-app/src/components/ReservationConflictModal.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

## Form controls and modal declarations

Source line 32:
```tsx
<Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
```

Source line 58:
```tsx
<Pressable style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
```

Source line 62:
```tsx
<Pressable style={[styles.transferBtn, loading && styles.disabled]} onPress={onTransfer} disabled={loading}>
```

## Conditional behavior

## Visible text

Source line 38:
```tsx
is already reserved
```

Source line 45:
```tsx
Held for
```

Source line 45:
```tsx
(
```

Source line 45:
```tsx
unit
```

Source line 46:
```tsx
) by
```

Source line 59:
```tsx
Cancel
```

Source line 68:
```tsx
Transfer to
```

## Styles

Source line 29:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

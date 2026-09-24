# SearchBar.tsx

Source: `mobile-app/src/components/ui/SearchBar.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 51:
```tsx
React.useState(value)
```

## Form controls and modal declarations

Source line 103:
```tsx
<TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        clearButtonMode="never"
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityRole="search"
        accessibilityLabel="Search input"
      />
```

Source line 126:
```tsx
<Pressable
          onPress={handleClear}
          hitSlop={8}
          style={styles.rightSlot}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
```

## Conditional behavior

Source line 62:
```tsx
if (debounceTimer.current) clearTimeout(debounceTimer.current);
```

Source line 64:
```tsx
if (debounceMs <= 0) {
        onChangeTextRef.current(text);
        return;
      }
```

Source line 79:
```tsx
if (debounceTimer.current) clearTimeout(debounceTimer.current);
```

Source line 84:
```tsx
if (debounceTimer.current) clearTimeout(debounceTimer.current);
```

## Visible text

## Styles

Source line 148:
```tsx
styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  leftIcon: {
    marginRight: spacing.xs,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: 0, // keeps correct vertical centering on Android
  },
  rightSlot: {
    marginLeft: spacing.xs,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

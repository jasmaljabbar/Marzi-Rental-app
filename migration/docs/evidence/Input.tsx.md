# Input.tsx

Source: `mobile-app/src/components/ui/Input.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 58:
```tsx
useState(false)
```

Source line 59:
```tsx
useState(false)
```

## Form controls and modal declarations

Source line 105:
```tsx
<TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            (rightIcon || secureTextEntry) ? styles.inputWithRight : null,
            multiline && styles.multiline,
          ]}
          value={value}
          onChangeText={(text) => {
            if (showCharCount && text.length > characterLimit) return;
            onChangeText(text);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={helperText}
        />
```

Source line 134:
```tsx
<Pressable
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
```

## Conditional behavior

Source line 114:
```tsx
if (showCharCount && text.length > characterLimit) return;
```

## Visible text

Source line 164:
```tsx
/
```

## Styles

Source line 175:
```tsx
styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    minHeight: 48,
  },
  focused: {
    borderColor: colors.borderFocus,
  },
  errorBorder: {
    borderColor: colors.danger,
  },
  disabled: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWithLeft: {
    paddingLeft: spacing.xs,
  },
  inputWithRight: {
    paddingRight: spacing.xs,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  leftIcon: {
    paddingLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  bottomLeft: {
    flex: 1,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: typography.weights.medium,
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  charCount: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
})
```

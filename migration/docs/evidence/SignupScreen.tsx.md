# SignupScreen.tsx

Source: `mobile-app/src/screens/SignupScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 23:
```tsx
useState("")
```

Source line 24:
```tsx
useState("")
```

Source line 25:
```tsx
useState("")
```

Source line 26:
```tsx
useState(false)
```

Source line 27:
```tsx
useState("")
```

Source line 31:
```tsx
setError("Enter your business name, a username, and a password of at least 8 characters.")
```

Source line 35:
```tsx
setError("")
```

Source line 39:
```tsx
setError(err instanceof Error ? err.message : "Couldn't create your account. Please try again.")
```

Source line 110:
```tsx
navigation.navigate("Login")
```

## Form controls and modal declarations

Source line 72:
```tsx
<Input
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Business name"
                leftIcon={<MaterialCommunityIcons name="storefront-outline" size={20} color={colors.textMuted} />}
                editable={!loading}
              />
```

Source line 79:
```tsx
<Input
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                leftIcon={<MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} />}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
```

Source line 88:
```tsx
<Input
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min. 8 characters)"
                secureTextEntry={true}
                leftIcon={<MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />}
                editable={!loading}
              />
```

Source line 100:
```tsx
<Button
              variant="accent"
              size="lg"
              loading={loading}
              onPress={onSignup}
              rightIcon={!loading ? <MaterialCommunityIcons name="arrow-right" size={20} color="white" /> : undefined}
            >
```

Source line 110:
```tsx
<Pressable style={styles.loginLink} onPress={() => navigation.navigate("Login")} disabled={loading}>
```

## Conditional behavior

Source line 30:
```tsx
if (!companyName.trim() || !username.trim() || password.length < 8) {
      setError("Enter your business name, a username, and a password of at least 8 characters.");
      return;
    }
```

## Visible text

Source line 62:
```tsx
RentalManager
```

Source line 64:
```tsx
Start your free trial
```

Source line 68:
```tsx
Create your business account
```

Source line 69:
```tsx
14 days free, full access, no card required.
```

Source line 107:
```tsx
Start free trial
```

Source line 111:
```tsx
Already have an account? Log in
```

## Styles

Source line 120:
```tsx
styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1, backgroundColor: colors.primary },
  blobTopLeft: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.15,
    top: -100,
    left: -100,
  },
  blobTopRight: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: radii.full,
    backgroundColor: colors.info,
    opacity: 0.12,
    top: 60,
    right: -80,
  },
  blobBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: radii.full,
    backgroundColor: colors.primaryDark,
    opacity: 0.5,
    bottom: -80,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxxl,
  },
  brandArea: { alignItems: "center", marginBottom: spacing.xxxl },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
  },
  appName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primarySoft,
    opacity: 0.8,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  cardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
  },
  fieldsContainer: { gap: spacing.md, marginBottom: spacing.lg },
  errorText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.danger,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  loginLink: { marginTop: spacing.lg, alignItems: "center" },
  loginLinkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryLight,
  },
})
```

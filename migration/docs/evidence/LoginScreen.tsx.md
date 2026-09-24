# LoginScreen.tsx

Source: `mobile-app/src/screens/LoginScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 32:
```tsx
useState(DEFAULT_ADMIN_USERNAME)
```

Source line 33:
```tsx
useState("")
```

Source line 34:
```tsx
useState(false)
```

Source line 35:
```tsx
useState("")
```

Source line 37:
```tsx
useState(false)
```

Source line 38:
```tsx
useState<"request" | "reset">("request")
```

Source line 39:
```tsx
useState("")
```

Source line 40:
```tsx
useState("")
```

Source line 41:
```tsx
useState("")
```

Source line 42:
```tsx
useState("")
```

Source line 43:
```tsx
useState(false)
```

Source line 44:
```tsx
useState("")
```

Source line 53:
```tsx
setForgotError("")
```

Source line 58:
```tsx
setForgotError("Enter your username first.")
```

Source line 62:
```tsx
setForgotError("")
```

Source line 64:
```tsx
authApi.requestPasswordReset(forgotUsername.trim())
```

Source line 73:
```tsx
setForgotError(err instanceof Error ? err.message : "Could not find that account.")
```

Source line 81:
```tsx
setForgotError("Enter the reset code and a new password.")
```

Source line 85:
```tsx
setForgotError("")
```

Source line 87:
```tsx
authApi.confirmPasswordReset(forgotUsername.trim(), resetCode.trim(), newPassword)
```

Source line 88:
```tsx
toast.success("Password updated. You can sign in now.")
```

Source line 92:
```tsx
setForgotError(err instanceof Error ? err.message : "Could not reset the password.")
```

Source line 100:
```tsx
setError("")
```

Source line 104:
```tsx
setError("Login failed. Check username/password.")
```

Source line 210:
```tsx
navigation.navigate("Signup")
```

Source line 218:
```tsx
Linking.openURL(SUPPORT_PHONE ? `tel:${SUPPORT_PHONE}` : `mailto:${SUPPORT_EMAIL}`)
```

## Form controls and modal declarations

Source line 152:
```tsx
<Input
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                leftIcon={
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                }
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
```

Source line 168:
```tsx
<Input
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={true}
                leftIcon={
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                }
                editable={!loading}
              />
```

Source line 186:
```tsx
<Button
              variant="accent"
              size="lg"
              loading={loading}
              onPress={onLogin}
              rightIcon={
                !loading ? (
                  <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                ) : undefined
              }
            >
```

Source line 200:
```tsx
<Pressable
              style={styles.forgotLink}
              onPress={() => {
                setForgotUsername(username.trim());
                setShowForgot(true);
              }}
            >
```

Source line 210:
```tsx
<Pressable style={styles.signupLink} onPress={() => navigation.navigate("Signup")}>
```

Source line 216:
```tsx
<Pressable
              style={styles.supportRow}
              onPress={() => Linking.openURL(SUPPORT_PHONE ? `tel:${SUPPORT_PHONE}` : `mailto:${SUPPORT_EMAIL}`)}
            >
```

Source line 231:
```tsx
<Modal visible={showForgot} animationType="slide" transparent onRequestClose={resetForgotState}>
```

Source line 236:
```tsx
<Pressable onPress={resetForgotState} hitSlop={10}>
```

Source line 244:
```tsx
<Input
                  value={forgotUsername}
                  onChangeText={setForgotUsername}
                  placeholder="Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={<MaterialCommunityIcons name="account-outline" size={18} color={colors.textMuted} />}
                />
```

Source line 253:
```tsx
<Button variant="accent" size="md" loading={forgotLoading} onPress={handleRequestReset}>
```

Source line 260:
```tsx
<Input
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="6-digit reset code"
                  keyboardType="number-pad"
                  leftIcon={<MaterialCommunityIcons name="shield-key-outline" size={18} color={colors.textMuted} />}
                />
```

Source line 267:
```tsx
<Input
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  secureTextEntry
                  leftIcon={<MaterialCommunityIcons name="lock-outline" size={18} color={colors.textMuted} />}
                />
```

Source line 275:
```tsx
<Button variant="accent" size="md" loading={forgotLoading} onPress={handleConfirmReset}>
```

## Conditional behavior

Source line 57:
```tsx
if (!forgotUsername.trim()) {
      setForgotError("Enter your username first.");
      return;
    }
```

Source line 65:
```tsx
if (result.reset_code_for_demo) {
        setResetCode(result.reset_code_for_demo);
        setDemoCodeHint(
          "Email/SMS delivery isn't configured for this shop yet, so your reset code is shown here — enter it below.",
        );
      }
```

Source line 80:
```tsx
if (!resetCode.trim() || !newPassword) {
      setForgotError("Enter the reset code and a new password.");
      return;
    }
```

## Visible text

Source line 139:
```tsx
RentalManager
```

Source line 142:
```tsx
Equipment Rental &amp; Inventory Management
```

Source line 148:
```tsx
Welcome back
```

Source line 149:
```tsx
Sign in to your account
```

Source line 197:
```tsx
Sign In
```

Source line 207:
```tsx
Forgot password?
```

Source line 211:
```tsx
New business? Start your free trial
```

Source line 221:
```tsx
Need help signing in? Contact support
```

Source line 226:
```tsx
Cloud · MongoDB Atlas
```

Source line 235:
```tsx
Reset password
```

Source line 243:
```tsx
Enter your username and we'll generate a reset code.
```

Source line 254:
```tsx
Send Reset Code
```

Source line 276:
```tsx
Update Password
```

## Styles

Source line 288:
```tsx
styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: colors.primary,
  },
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
  brandArea: {
    alignItems: "center",
    marginBottom: spacing.xxxxl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
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
  fieldsContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  signupLink: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  signupLinkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryLight,
  },
  forgotLink: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  forgotLinkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  supportRowText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primarySoft,
  },
  forgotOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  forgotCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  forgotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  forgotHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.danger,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  footerText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.primarySoft,
    opacity: 0.6,
    textAlign: "center",
    marginTop: spacing.xl,
  },
})
```

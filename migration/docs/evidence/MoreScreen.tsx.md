# MoreScreen.tsx

Source: `mobile-app/src/screens/MoreScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 38:
```tsx
useState(false)
```

Source line 41:
```tsx
hasFeature("analytics")
```

Source line 43:
```tsx
useQuery({
    queryKey: ["settings", MAX_DISCOUNT_PERCENT_KEY],
    queryFn: () => settingsApi.get(MAX_DISCOUNT_PERCENT_KEY),
  })
```

Source line 45:
```tsx
settingsApi.get(MAX_DISCOUNT_PERCENT_KEY)
```

Source line 47:
```tsx
useState("")
```

Source line 54:
```tsx
settingsApi.set(MAX_DISCOUNT_PERCENT_KEY, String(numeric))
```

Source line 56:
```tsx
queryClient.invalidateQueries({ queryKey: ["settings", MAX_DISCOUNT_PERCENT_KEY] })
```

Source line 57:
```tsx
toast.success(numeric > 0 ? `Return discounts are now capped at ${numeric}%.` : "Discount cap removed — any discount amount is allowed.")
```

Source line 60:
```tsx
useQuery({ queryKey: ["sync-status", "more"], queryFn: syncApi.status })
```

Source line 67:
```tsx
rootNav.reset({ index: 0, routes: [{ name: "Login" }] })
```

Source line 105:
```tsx
navigation.navigate("Dashboard")
```

Source line 113:
```tsx
navigation.navigate("Master")
```

Source line 122:
```tsx
navigation.navigate("Reports")
```

Source line 131:
```tsx
navigation.navigate("AccountStatus")
```

Source line 139:
```tsx
navigation.navigate("InvoiceList")
```

Source line 223:
```tsx
navigation.navigate("CompanySettings")
```

Source line 260:
```tsx
Linking.openURL(`tel:${SUPPORT_PHONE}`)
```

Source line 272:
```tsx
Linking.openURL(`mailto:${SUPPORT_EMAIL}`)
```

## Form controls and modal declarations

Source line 154:
```tsx
<Pressable
                key={option.mode}
                style={[styles.themeOption, active && styles.themeOptionActive]}
                onPress={() => setThemeMode(option.mode)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${option.label} theme`}
                accessibilityState={{ selected: active }}
              >
```

Source line 181:
```tsx
<TextInput
              style={styles.ruleInput}
              value={maxDiscountInput}
              onChangeText={setMaxDiscountInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={c.textMuted}
            />
```

Source line 191:
```tsx
<Pressable style={styles.ruleSaveBtn} onPress={saveMaxDiscount} accessibilityRole="button" accessibilityLabel="Save max discount percent">
```

Source line 221:
```tsx
<Pressable
          style={styles.helpRow}
          onPress={() => navigation.navigate("CompanySettings")}
          accessibilityRole="button"
          accessibilityLabel="Company and invoice settings"
        >
```

Source line 233:
```tsx
<Button
          variant="danger"
          size="md"
          leftIcon={<MaterialCommunityIcons name="logout" size={18} color={c.textInverse} />}
          onPress={() => setShowLogoutConfirm(true)}
        >
```

Source line 258:
```tsx
<Pressable
            style={styles.helpRow}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            accessibilityRole="button"
            accessibilityLabel="Call support"
          >
```

Source line 270:
```tsx
<Pressable
            style={styles.helpRow}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            accessibilityRole="button"
            accessibilityLabel="Email support"
          >
```

Source line 291:
```tsx
<Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
```

Source line 309:
```tsx
<Button
                  variant="secondary"
                  size="md"
                  onPress={() => setShowLogoutConfirm(false)}
                >
```

Source line 318:
```tsx
<Button
                  variant="danger"
                  size="md"
                  onPress={() => {
                    setShowLogoutConfirm(false);
                    void handleLogout();
                  }}
                >
```

Source line 355:
```tsx
<Pressable style={styles.quickCard} onPress={onPress} accessibilityRole="button">
```

## Conditional behavior

## Visible text

Source line 83:
```tsx
More
```

Source line 94:
```tsx
Insights and account settings
```

Source line 147:
```tsx
Appearance
```

Source line 174:
```tsx
Rental Rules
```

Source line 177:
```tsx
Limit how much discount staff can apply when receiving a return. Leave at 0 for no limit.
```

Source line 189:
```tsx
%
```

Source line 192:
```tsx
Save
```

Source line 207:
```tsx
Account
```

Source line 216:
```tsx
Signed in as
```

Source line 228:
```tsx
Company & Invoice Settings
```

Source line 239:
```tsx
Logout
```

Source line 247:
```tsx
Help &amp; Support
```

Source line 265:
```tsx
Call support
```

Source line 277:
```tsx
Email support
```

Source line 282:
```tsx
Ask your shop admin for support contact details.
```

Source line 286:
```tsx
App version
```

Source line 304:
```tsx
Logout
```

Source line 305:
```tsx
Do you want to logout?
```

Source line 314:
```tsx
Cancel
```

Source line 326:
```tsx
Confirm Logout
```

## Styles

Source line 31:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

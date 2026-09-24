# AccountStatusScreen.tsx

Source: `mobile-app/src/screens/AccountStatusScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 37:
```tsx
useQuery({
    queryKey: ["account", "me"],
    queryFn: accountApi.getMe,
  })
```

Source line 41:
```tsx
useQuery({
    queryKey: ["account", "usage"],
    queryFn: accountApi.getUsage,
  })
```

Source line 45:
```tsx
useQuery({
    queryKey: ["catalog"],
    queryFn: catalogApi.get,
    staleTime: Infinity,
  })
```

Source line 173:
```tsx
Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${contactSubject}&body=${contactBody}`)
```

Source line 181:
```tsx
Linking.openURL(whatsappUrl)
```

Source line 187:
```tsx
Linking.openURL(`tel:${SUPPORT_PHONE}`)
```

## Form controls and modal declarations

Source line 171:
```tsx
<Pressable
              style={styles.upgradeBtn}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${contactSubject}&body=${contactBody}`)}
              accessibilityRole="button"
            >
```

Source line 181:
```tsx
<Pressable style={styles.upgradeBtnOutline} onPress={() => Linking.openURL(whatsappUrl)} accessibilityRole="button">
```

Source line 187:
```tsx
<Pressable style={styles.upgradeBtnOutline} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} accessibilityRole="button">
```

## Conditional behavior

Source line 51:
```tsx
if (loadingAccount || loadingUsage) {
    return (
      <ScreenContainer>
        <Text style={styles.loadingText}>Loading…</Text>
      </ScreenContainer>
    );
  }
```

Source line 59:
```tsx
if (!account) {
    return (
      <ScreenContainer>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No business account</Text>
          <Text style={styles.cardSubtitle}>This login isn't linked to a subscription.</Text>
        </View>
      </ScreenContainer>
    );
  }
```

## Visible text

Source line 54:
```tsx
Loading…
```

Source line 63:
```tsx
No business account
```

Source line 64:
```tsx
This login isn't linked to a subscription.
```

Source line 99:
```tsx
day
```

Source line 99:
```tsx
remaining ·
```

Source line 115:
```tsx
This account has been suspended.
```

Source line 122:
```tsx
Plan usage
```

Source line 128:
```tsx
reached your plan limit. Upgrade to keep adding more.
```

Source line 135:
```tsx
close to your plan limit. Consider upgrading soon.
```

Source line 148:
```tsx
Plan features
```

Source line 166:
```tsx
Need a higher plan?
```

Source line 167:
```tsx
Reach out to upgrade, add more shops, or increase your team size.
```

Source line 177:
```tsx
Email Upgrade Request
```

Source line 183:
```tsx
WhatsApp Us
```

Source line 189:
```tsx
Call Us
```

Source line 193:
```tsx
Support contact isn't configured yet — ask your account administrator.
```

## Styles

Source line 35:
```tsx
styles = useMemo(() => createStyles(c), [c])
```

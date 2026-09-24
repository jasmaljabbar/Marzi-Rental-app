# CompanySettingsScreen.tsx

Source: `mobile-app/src/screens/CompanySettingsScreen.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 40:
```tsx
useState<FormState>(EMPTY_FORM)
```

Source line 41:
```tsx
useState(false)
```

Source line 43:
```tsx
hasFeature("customBranding")
```

Source line 45:
```tsx
useQuery({ queryKey: ["company-info"], queryFn: companyApi.get, retry: false })
```

Source line 60:
```tsx
useMutation({
    mutationFn: () =>
      companyApi.update({
        logo_url: form.logo_url || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        tax_id: form.tax_id || null,
        footer_note: form.footer_note || null,
        default_tax_rate_percent: Math.min(Math.max(Number(form.default_tax_rate_percent) || 0, 0), 100),
      }),
    onSuccess: () => {
      toast.success("Invoice branding saved.");
      queryClient.invalidateQueries({ queryKey: ["company-info"] });
    },
    onError: (err: any) => toast.error(err instanceof Error ? err.message : "Could not save changes."),
  })
```

Source line 62:
```tsx
companyApi.update({
        logo_url: form.logo_url || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        tax_id: form.tax_id || null,
        footer_note: form.footer_note || null,
        default_tax_rate_percent: Math.min(Math.max(Number(form.default_tax_rate_percent) || 0, 0), 100),
      })
```

Source line 72:
```tsx
toast.success("Invoice branding saved.")
```

Source line 73:
```tsx
queryClient.invalidateQueries({ queryKey: ["company-info"] })
```

Source line 75:
```tsx
toast.error(err instanceof Error ? err.message : "Could not save changes.")
```

Source line 82:
```tsx
toast.error("Please grant photo library access to upload a logo.")
```

Source line 97:
```tsx
uploadApi.uploadFile(asset.uri, fileName, mimeType)
```

Source line 100:
```tsx
toast.error(error instanceof Error ? error.message : "Could not upload logo.")
```

## Form controls and modal declarations

Source line 132:
```tsx
<Pressable style={styles.logoWrap} onPress={pickLogo} disabled={uploadingLogo} accessibilityRole="button">
```

Source line 153:
```tsx
<Input label="Business address" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} multiline placeholder="Shop address printed on invoices" />
```

Source line 154:
```tsx
<Input label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" placeholder="+91 98765 43210" />
```

Source line 155:
```tsx
<Input label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder="billing@yourshop.com" />
```

Source line 156:
```tsx
<Input label="Tax ID (GSTIN / VAT / etc.)" value={form.tax_id} onChangeText={(v) => setForm((f) => ({ ...f, tax_id: v }))} autoCapitalize="characters" placeholder="Optional" />
```

Source line 157:
```tsx
<Input
        label="Default tax rate (%)"
        value={form.default_tax_rate_percent}
        onChangeText={(v) => setForm((f) => ({ ...f, default_tax_rate_percent: v }))}
        keyboardType="decimal-pad"
        helperText="Applied automatically to new invoices — can be overridden per return."
      />
```

Source line 164:
```tsx
<Input
        label="Invoice footer note"
        value={form.footer_note}
        onChangeText={(v) => setForm((f) => ({ ...f, footer_note: v }))}
        multiline
        placeholder="e.g. Thank you for your business! Payment due within 7 days."
      />
```

Source line 172:
```tsx
<Button variant="primary" size="lg" loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
```

## Conditional behavior

Source line 48:
```tsx
if (!companyQuery.data) return;
```

Source line 81:
```tsx
if (!permission.granted) {
        toast.error("Please grant photo library access to upload a logo.");
        return;
      }
```

Source line 90:
```tsx
if (result.canceled || !result.assets?.length) return;
```

Source line 106:
```tsx
if (companyQuery.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={c.primary} style={{ marginTop: spacing.xxxxl }} />
      </ScreenContainer>
    );
  }
```

Source line 114:
```tsx
if ((companyQuery.error as ApiError | undefined)?.status === 404) {
    return (
      <ScreenContainer>
        <View style={styles.unavailable}>
          <MaterialCommunityIcons name="office-building-outline" size={40} color={c.textMuted} />
          <Text style={styles.unavailableText}>
            Company & invoice branding is available for cloud accounts. Ask your workspace owner to invite you
            through the sign-up flow to unlock this.
          </Text>
        </View>
      </ScreenContainer>
    );
  }
```

## Visible text

Source line 120:
```tsx
Company & invoice branding is available for cloud accounts. Ask your workspace owner to invite you
            through the sign-up flow to unlock this.
```

Source line 142:
```tsx
Company logo
```

Source line 143:
```tsx
Shown on every generated invoice. Tap to change.
```

Source line 149:
```tsx
Custom logo branding isn't included in your current plan. Upgrade to unlock it.
```

Source line 173:
```tsx
Save Changes
```

## Styles

Source line 37:
```tsx
styles = createStyles(c)
```

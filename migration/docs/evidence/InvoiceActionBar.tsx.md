# InvoiceActionBar.tsx

Source: `mobile-app/src/components/invoice/InvoiceActionBar.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 15:
```tsx
useState<ActionKey | null>(null)
```

Source line 22:
```tsx
toast.success(successMessage)
```

Source line 24:
```tsx
toast.error(err?.message || "Something went wrong. Please try again.")
```

## Form controls and modal declarations

Source line 32:
```tsx
<ActionButton
        styles={styles}
        iconColor={c.primary}
        icon="share-variant"
        label="Share"
        busy={busy === "share"}
        disabled={!!busy}
        onPress={() => run("share", () => shareInvoicePdf(rentalId, invoiceNumber))}
      />
```

Source line 41:
```tsx
<ActionButton
        styles={styles}
        iconColor={c.primary}
        icon="printer-outline"
        label="Print"
        busy={busy === "print"}
        disabled={!!busy}
        onPress={() => run("print", () => printInvoicePdf(rentalId, invoiceNumber))}
      />
```

Source line 50:
```tsx
<ActionButton
        styles={styles}
        iconColor={c.primary}
        icon="download-outline"
        label={Platform.OS === "ios" ? "Save to Files" : "Download"}
        busy={busy === "download"}
        disabled={!!busy}
        onPress={() =>
          run(
            "download",
            () => saveInvoicePdfToDevice(rentalId, invoiceNumber),
            Platform.OS === "android" ? "Invoice saved." : undefined
          )
        }
      />
```

Source line 87:
```tsx
<Pressable
      style={[styles.button, disabled && !busy && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
```

## Conditional behavior

Source line 18:
```tsx
if (busy) return;
```

Source line 22:
```tsx
if (successMessage) toast.success(successMessage);
```

## Visible text

## Styles

Source line 13:
```tsx
styles = createStyles(c)
```

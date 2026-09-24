# CustomerForm.tsx

Source: `mobile-app/src/components/CustomerForm.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 57:
```tsx
useState<CustomerFormValue>(() => toFormValue(initialValue))
```

Source line 58:
```tsx
useState(false)
```

Source line 59:
```tsx
useState(false)
```

Source line 60:
```tsx
useState(false)
```

Source line 61:
```tsx
useState(false)
```

Source line 71:
```tsx
toast.error("Please grant photo library access to continue.")
```

Source line 88:
```tsx
uploadApi.uploadFile(asset.uri, fileName, mimeType)
```

Source line 91:
```tsx
toast.error(err instanceof Error ? err.message : "Could not upload photo. Please try again.")
```

Source line 101:
```tsx
toast.error("Please grant photo library access to continue.")
```

Source line 113:
```tsx
uploadApi.uploadFile(asset.uri, fileName, asset.mimeType || "image/jpeg")
```

Source line 116:
```tsx
toast.error(err instanceof Error ? err.message : "Could not upload document. Please try again.")
```

Source line 124:
```tsx
toast.error("Name is required.")
```

Source line 128:
```tsx
toast.error("Phone number is required.")
```

## Form controls and modal declarations

Source line 146:
```tsx
<TextInput style={styles.input} value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Jane Doe" />
```

Source line 151:
```tsx
<TextInput style={styles.input} value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="+91 98765 43210" keyboardType="phone-pad" />
```

Source line 179:
```tsx
<Pressable style={styles.docSmBtn} onPress={() => setShowDocCamera(true)}>
```

Source line 183:
```tsx
<Pressable style={styles.docSmBtn} onPress={handleDocUpload}>
```

Source line 187:
```tsx
<Pressable style={styles.docSmBtnDanger} onPress={() => setForm((c) => ({ ...c, doc_url: "" }))}>
```

Source line 200:
```tsx
<Pressable style={styles.docBtn} onPress={() => setShowDocCamera(true)}>
```

Source line 204:
```tsx
<Pressable style={styles.docBtn} onPress={handleDocUpload}>
```

Source line 215:
```tsx
<TextInput style={[styles.input, styles.addressInput]} value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} placeholder="Street, City" multiline />
```

Source line 235:
```tsx
<Pressable style={styles.outlineBtn} onPress={handlePick}>
```

Source line 238:
```tsx
<Pressable style={styles.ghostBtn} onPress={() => setShowCamera(true)}>
```

Source line 252:
```tsx
<Pressable style={styles.primaryBtn} onPress={submit} disabled={isSubmitting || uploading}>
```

Source line 255:
```tsx
<Pressable style={styles.secondaryBtn} onPress={onCancel} disabled={isSubmitting}>
```

Source line 259:
```tsx
<CustomerPhotoCaptureModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCaptured={(storedPath) => {
          setForm((current) => ({ ...current, photo_url: storedPath }));
          setShowCamera(false);
        }}
      />
```

Source line 268:
```tsx
<DocumentCaptureModal
        visible={showDocCamera}
        onClose={() => setShowDocCamera(false)}
        onCaptured={(url) => setForm((current) => ({ ...current, doc_url: url }))}
      />
```

## Conditional behavior

Source line 70:
```tsx
if (!permission.granted) {
        toast.error("Please grant photo library access to continue.");
        return;
      }
```

Source line 81:
```tsx
if (result.canceled || !result.assets?.length) return;
```

Source line 100:
```tsx
if (!permission.granted) {
        toast.error("Please grant photo library access to continue.");
        return;
      }
```

Source line 109:
```tsx
if (result.canceled || !result.assets?.length) return;
```

Source line 123:
```tsx
if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
```

Source line 127:
```tsx
if (!form.phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }
```

## Visible text

Source line 145:
```tsx
Name
```

Source line 150:
```tsx
Phone
```

Source line 156:
```tsx
Document (Optional)
```

Source line 162:
```tsx
Uploading document...
```

Source line 176:
```tsx
Document attached
```

Source line 181:
```tsx
Retake
```

Source line 185:
```tsx
Replace
```

Source line 189:
```tsx
Remove
```

Source line 198:
```tsx
No document attached
```

Source line 202:
```tsx
Take Photo
```

Source line 206:
```tsx
Upload
```

Source line 214:
```tsx
Address
```

Source line 228:
```tsx
+
```

Source line 233:
```tsx
Customer photo
```

Source line 236:
```tsx
Upload
```

Source line 239:
```tsx
Take Photo
```

Source line 242:
```tsx
Use the guided camera for a centered headshot, or upload from the gallery.
```

Source line 246:
```tsx
Uploading photo...
```

Source line 256:
```tsx
Close
```

## Styles

Source line 277:
```tsx
styles = StyleSheet.create({
  h2: { fontSize: 20, fontWeight: "700" },
  formCard: { backgroundColor: "white", borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: "#E6EDF5", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  field: { gap: 6 },
  fieldRow: { flexDirection: "row", gap: 10 },
  label: { fontWeight: "700", color: "#1F2937", fontSize: 13 },
  input: { borderWidth: 1, borderColor: "#d6e1ee", borderRadius: 8, padding: 9, backgroundColor: "#fbfdff" },
  addressInput: { minHeight: 60 },
  avatarPlaceholder: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#E8F1FB", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontWeight: "800", color: "#1B365D", fontSize: 24 },
  photoCard: { flexDirection: "row", gap: 12, backgroundColor: "#F8FBFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#DFE8F5" },
  photoContent: { flex: 1, gap: 8 },
  photoButtons: { flexDirection: "row", gap: 8 },
  photoPreview: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#E8F1FB" },
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  uploadText: { color: "#0d9488", fontWeight: "700" },
  outlineBtn: { borderWidth: 1.5, borderColor: "#1D8DF2", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#EFF6FF" },
  outlineBtnText: { color: "#1D8DF2", fontWeight: "800" },
  ghostBtn: { borderWidth: 1, borderColor: "#dbeafe", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#FFFFFF" },
  ghostBtnText: { color: "#0F172A", fontWeight: "700" },
  primaryBtn: { backgroundColor: "#1D8DF2", paddingVertical: 14, borderRadius: 12, alignItems: "center", shadowColor: "#1D8DF2", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  primaryBtnText: { color: "white", fontWeight: "800", letterSpacing: 0.3 },
  helpText: { color: "#4B5563", fontSize: 12 },
  secondaryBtn: { backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  secondaryBtnText: { color: "#1F2937", fontWeight: "700" },

  // Document — uploading
  docUploading: {
    borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12,
    backgroundColor: "#EFF6FF", paddingVertical: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  docUploadingText: { color: "#1D8DF2", fontWeight: "700", fontSize: 13 },

  // Document — filled (thumbnail + row)
  docFilled: {
    borderWidth: 1, borderColor: "#DFE8F5", borderRadius: 12,
    backgroundColor: "#F8FBFF", overflow: "hidden",
  },
  docImg: { width: "100%", height: 180, backgroundColor: "#E2E8F0" },
  docFilledRow: { padding: 10, gap: 8 },
  docFilledBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  docFilledBadgeText: { color: "#10B981", fontWeight: "700", fontSize: 12 },
  docSmActions: { flexDirection: "row", gap: 6 },
  docSmBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 1, borderColor: "#1D8DF2", borderRadius: 8,
    paddingVertical: 7, backgroundColor: "#EFF6FF",
  },
  docSmBtnText: { color: "#1D8DF2", fontWeight: "700", fontSize: 11 },
  docSmBtnDanger: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 8,
    paddingVertical: 7, backgroundColor: "#FFF5F5",
  },
  docSmBtnDangerText: { color: "#EF4444", fontWeight: "700", fontSize: 11 },

  // Document — empty
  docEmpty: {
    borderWidth: 1.5, borderColor: "#DFE8F5", borderRadius: 12,
    borderStyle: "dashed" as const, backgroundColor: "#F8FBFF",
    paddingVertical: 22, paddingHorizontal: 16,
    alignItems: "center", gap: 8,
  },
  docEmptyText: { color: "#94A3B8", fontSize: 13 },
  docActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 2 },
  docBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#1D8DF2", borderRadius: 10,
    paddingVertical: 10, backgroundColor: "#EFF6FF",
  },
  docBtnText: { color: "#1D8DF2", fontWeight: "700", fontSize: 13 },
})
```

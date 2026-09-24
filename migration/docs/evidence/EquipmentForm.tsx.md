# EquipmentForm.tsx

Source: `mobile-app/src/components/EquipmentForm.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 60:
```tsx
useState<EquipmentFormValue>(() => toFormValue(initialValue))
```

Source line 61:
```tsx
useState(false)
```

Source line 62:
```tsx
useState("")
```

Source line 63:
```tsx
useState("")
```

Source line 64:
```tsx
useState(false)
```

Source line 70:
```tsx
useQuery({ queryKey: ["categories"], queryFn: categoryApi.list })
```

Source line 73:
```tsx
useMutation({
    mutationFn: () => categoryApi.create(newCategoryName.trim()),
    onSuccess: async (category) => {
      setForm((current) => ({ ...current, category_id: String(category.id) }));
      setNewCategoryName("");
      setCategoryError("");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      setCategoryError(error instanceof Error ? error.message : "Unable to add category.");
    },
  })
```

Source line 74:
```tsx
categoryApi.create(newCategoryName.trim())
```

Source line 78:
```tsx
setCategoryError("")
```

Source line 79:
```tsx
queryClient.invalidateQueries({ queryKey: ["categories"] })
```

Source line 82:
```tsx
setCategoryError(error instanceof Error ? error.message : "Unable to add category.")
```

Source line 90:
```tsx
toast.error("Please grant photo library access to upload images.")
```

Source line 105:
```tsx
uploadApi.uploadFile(asset.uri, fileName, mimeType)
```

Source line 111:
```tsx
toast.error(error instanceof Error ? error.message : "Could not upload image.")
```

Source line 119:
```tsx
toast.error("Equipment name is required.")
```

Source line 123:
```tsx
toast.error("Please select a category.")
```

Source line 245:
```tsx
setCategoryError("")
```

## Form controls and modal declarations

Source line 145:
```tsx
<TextInput style={styles.input} placeholder="Enter equipment name" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
```

Source line 150:
```tsx
<Pressable style={styles.dropdown} onPress={() => setShowCategoryModal(true)}>
```

Source line 162:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={form.stock_count} onChangeText={(value) => setForm((current) => ({ ...current, stock_count: value }))} />
```

Source line 167:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={form.rent_per_day} onChangeText={(value) => setForm((current) => ({ ...current, rent_per_day: value }))} />
```

Source line 174:
```tsx
<TextInput style={styles.input} placeholder="0" keyboardType="decimal-pad" value={form.purchase_price_per_unit} onChangeText={(value) => setForm((current) => ({ ...current, purchase_price_per_unit: value }))} />
```

Source line 178:
```tsx
<TextInput style={styles.input} placeholder="5" keyboardType="numeric" value={form.useful_life_years} onChangeText={(value) => setForm((current) => ({ ...current, useful_life_years: value }))} />
```

Source line 184:
```tsx
<TextInput style={styles.input} placeholder="Short description" value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} />
```

Source line 190:
```tsx
<Pressable style={styles.addLink} onPress={pickImage} disabled={form.images.length >= 4 || uploadingImage}>
```

Source line 202:
```tsx
<Pressable style={styles.thumbRemove} onPress={() => setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))}>
```

Source line 208:
```tsx
<Pressable style={styles.thumbAdd} onPress={pickImage} disabled={uploadingImage}>
```

Source line 216:
```tsx
<Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={isSubmitting || uploadingImage}>
```

Source line 219:
```tsx
<Pressable style={styles.secondaryBtn} onPress={onCancel} disabled={isSubmitting}>
```

Source line 223:
```tsx
<Modal visible={showCategoryModal} animationType="fade" transparent onRequestClose={() => setShowCategoryModal(false)}>
```

Source line 228:
```tsx
<Pressable
                key={category.id}
                style={styles.catOption}
                onPress={() => {
                  setForm((current) => ({ ...current, category_id: String(category.id) }));
                  setShowCategoryModal(false);
                }}
              >
```

Source line 241:
```tsx
<TextInput
                style={styles.input}
                placeholder="Category name"
                value={newCategoryName}
                onChangeText={(v) => { setNewCategoryName(v); setCategoryError(""); }}
              />
```

Source line 248:
```tsx
<Pressable style={styles.primaryBtn} onPress={() => categoryCreateMutation.mutate()} disabled={!newCategoryName.trim() || categoryCreateMutation.isPending}>
```

Source line 252:
```tsx
<Pressable style={styles.cancelOpt} onPress={() => setShowCategoryModal(false)}>
```

## Conditional behavior

Source line 89:
```tsx
if (!permission.granted) {
        toast.error("Please grant photo library access to upload images.");
        return;
      }
```

Source line 98:
```tsx
if (result.canceled || !result.assets?.length) return;
```

Source line 118:
```tsx
if (!form.name.trim()) {
      toast.error("Equipment name is required.");
      return;
    }
```

Source line 122:
```tsx
if (!form.category_id) {
      toast.error("Please select a category.");
      return;
    }
```

## Visible text

Source line 144:
```tsx
Equipment Name
```

Source line 149:
```tsx
Category
```

Source line 161:
```tsx
Stock Count
```

Source line 166:
```tsx
Rent / Day (INR)
```

Source line 173:
```tsx
Purchase Price / Unit (INR)
```

Source line 177:
```tsx
Useful Life (years)
```

Source line 183:
```tsx
Description
```

Source line 189:
```tsx
Images (
```

Source line 189:
```tsx
/4)
```

Source line 210:
```tsx
Upload
```

Source line 220:
```tsx
Close
```

Source line 226:
```tsx
Select category
```

Source line 240:
```tsx
Add new category
```

Source line 253:
```tsx
Close
```

## Styles

Source line 262:
```tsx
styles = StyleSheet.create({
  formCard: { backgroundColor: "white", borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: "#E6EDF5", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  h2: { fontSize: 22, fontWeight: "700" },
  fieldBlock: { gap: 6, marginBottom: 6 },
  fieldLabel: { fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#d6e1ee", borderRadius: 10, backgroundColor: "#fbfdff", paddingHorizontal: 10, paddingVertical: 9 },
  dropdown: { borderWidth: 1, borderColor: "#d6e1ee", borderRadius: 10, backgroundColor: "#fbfdff", paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownText: { flex: 1, color: "#1f2937", fontWeight: "700" },
  row2: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  full: { width: "100%" },
  imageSection: { gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontWeight: "700", color: "#1B365D" },
  addLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  addLinkText: { fontWeight: "700" },
  imageGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  thumbWrap: { width: 96, height: 96, borderRadius: 12, overflow: "hidden", position: "relative", backgroundColor: "#EEF2F9" },
  thumb: { width: "100%", height: "100%" },
  thumbRemove: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 4 },
  thumbAdd: { width: 96, height: 96, borderRadius: 12, borderWidth: 1, borderColor: "#d6e1ee", backgroundColor: "#fbfdff", alignItems: "center", justifyContent: "center", gap: 4, borderStyle: "dashed" as any },
  meta: { color: "#4F6480", fontSize: 12 },
  primaryBtn: { backgroundColor: "#2F80ED", borderRadius: 10, alignItems: "center", paddingVertical: 11 },
  primaryBtnText: { color: "white", fontWeight: "700" },
  secondaryBtn: { borderWidth: 1, borderColor: "#CBD9EB", borderRadius: 10, alignItems: "center", paddingVertical: 11 },
  secondaryBtnText: { color: "#35506B", fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  catSheet: { backgroundColor: "white", padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 6 },
  sheetTitle: { fontWeight: "800", fontSize: 16, color: "#1B365D" },
  catOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  catOptionText: { fontWeight: "700", color: "#1f2937" },
  newCategoryWrap: { gap: 6, marginTop: 8 },
  categoryErrorText: { color: "#DC2626", fontSize: 12, fontWeight: "600" },
  cancelOpt: { marginTop: 4, paddingVertical: 12, alignItems: "center" },
  cancelOptText: { fontWeight: "700", color: "#5b6472" },
})
```

# DocumentCaptureModal.tsx

Source: `mobile-app/src/components/DocumentCaptureModal.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 16:
```tsx
useState<CameraType>("back")
```

Source line 17:
```tsx
useState(false)
```

Source line 18:
```tsx
useState(false)
```

Source line 19:
```tsx
useState("")
```

Source line 26:
```tsx
setCaptureError("")
```

Source line 32:
```tsx
setCaptureError("")
```

Source line 37:
```tsx
uploadApi.uploadFile(photo.uri, `doc-${Date.now()}.jpg`, "image/jpeg")
```

Source line 41:
```tsx
setCaptureError(err?.message || "Could not save the photo. Please try again.")
```

## Form controls and modal declarations

Source line 50:
```tsx
<Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
```

Source line 64:
```tsx
<Pressable style={styles.permBtn} onPress={requestPermission}>
```

Source line 67:
```tsx
<Pressable style={styles.linkBtn} onPress={onClose}>
```

Source line 83:
```tsx
<Pressable style={styles.iconBtn} onPress={onClose} disabled={isSaving}>
```

Source line 90:
```tsx
<Pressable
                style={styles.iconBtn}
                onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
                disabled={isSaving}
              >
```

Source line 119:
```tsx
<Pressable
                style={[styles.captureBtn, !canCapture && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={!canCapture}
              >
```

## Conditional behavior

Source line 22:
```tsx
if (!visible) {
      setIsCameraReady(false);
      setIsSaving(false);
      setFacing("back");
      setCaptureError("");
    }
```

Source line 31:
```tsx
if (!cameraRef.current || !isCameraReady || isSaving) return;
```

Source line 36:
```tsx
if (!photo?.uri) throw new Error("Camera did not return an image.");
```

## Visible text

Source line 55:
```tsx
Preparing camera…
```

Source line 62:
```tsx
Allow camera access
```

Source line 63:
```tsx
Camera is needed to photograph your document.
```

Source line 65:
```tsx
Enable Camera
```

Source line 68:
```tsx
Not now
```

Source line 87:
```tsx
Scan Document
```

Source line 88:
```tsx
Point at the document and tap capture.
```

## Styles

Source line 143:
```tsx
styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  centerText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  permIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  panelTitle: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  panelSub: { color: "#CBD5E1", fontSize: 14, lineHeight: 20, textAlign: "center" },
  permBtn: {
    backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 999, minWidth: 180, alignItems: "center",
  },
  permBtnText: { color: "#0F172A", fontWeight: "800" },
  linkBtn: { paddingVertical: 8 },
  linkBtnText: { color: "#E2E8F0", fontWeight: "700" },

  topBar: {
    position: "absolute", top: 54, left: 16, right: 16,
    flexDirection: "row", alignItems: "center",
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "#D9E4F0", fontSize: 12, marginTop: 2 },

  // Document corner guide
  guideWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  guideBox: {
    width: "80%", height: "42%", position: "relative",
  },
  corner: {
    position: "absolute", width: 28, height: 28,
    borderColor: "#fff", borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  errorBanner: {
    position: "absolute", bottom: 180, left: 24, right: 24,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(254,242,242,0.95)", borderWidth: 1, borderColor: "#FCA5A5",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorBannerText: { flex: 1, color: "#DC2626", fontWeight: "600", fontSize: 13 },
  bottomBar: {
    position: "absolute", bottom: 48, left: 0, right: 0,
    alignItems: "center", gap: 12,
  },
  captureBtn: {
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 4, borderColor: "rgba(255,255,255,0.65)",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  hint: { color: "#E2E8F0", fontSize: 13, fontWeight: "700" },
})
```

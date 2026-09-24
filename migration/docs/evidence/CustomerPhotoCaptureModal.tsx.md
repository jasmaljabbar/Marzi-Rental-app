# CustomerPhotoCaptureModal.tsx

Source: `mobile-app/src/components/CustomerPhotoCaptureModal.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 76:
```tsx
useState<CameraType>("front")
```

Source line 77:
```tsx
useState(false)
```

Source line 78:
```tsx
useState(false)
```

Source line 79:
```tsx
useState(false)
```

Source line 80:
```tsx
useState("")
```

Source line 121:
```tsx
uploadApi.uploadFile(croppedUri, `customer-${Date.now()}.jpg`, "image/jpeg")
```

Source line 127:
```tsx
setCaptureError(error?.message || "We couldn't save that photo. Please try again.")
```

Source line 239:
```tsx
setCaptureError("")
```

## Form controls and modal declarations

Source line 136:
```tsx
<Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
```

Source line 150:
```tsx
<Pressable style={styles.permissionBtn} onPress={requestPermission}>
```

Source line 153:
```tsx
<Pressable style={styles.linkBtn} onPress={onClose}>
```

Source line 182:
```tsx
<Pressable style={styles.topAction} onPress={onClose}>
```

Source line 239:
```tsx
<Pressable onPress={() => setCaptureError("")}>
```

Source line 246:
```tsx
<Pressable style={styles.secondaryAction} onPress={() => setFacing((current) => (current === "front" ? "back" : "front"))} disabled={isSaving}>
```

Source line 251:
```tsx
<Pressable style={[styles.captureButton, !canCapture && styles.captureButtonDisabled]} onPress={handleCapture} disabled={!canCapture}>
```

## Conditional behavior

Source line 32:
```tsx
if (!imageWidth || !imageHeight) {
    return uri;
  }
```

Source line 88:
```tsx
if (!visible) {
      setIsCameraReady(false);
      setIsSaving(false);
      setDidCapture(false);
      setFacing("front");
    }
```

Source line 97:
```tsx
if (!cameraRef.current || !isCameraReady || isSaving) return;
```

Source line 106:
```tsx
if (!photo?.uri) {
        throw new Error("The camera did not return an image.");
      }
```

## Visible text

Source line 141:
```tsx
Preparing camera
```

Source line 148:
```tsx
Allow camera access
```

Source line 149:
```tsx
We use the front camera so the customer can line up their face inside the guide.
```

Source line 151:
```tsx
Enable Camera
```

Source line 154:
```tsx
Not now
```

Source line 186:
```tsx
Customer photo
```

Source line 187:
```tsx
Center the face inside the circle for a clean profile photo.
```

Source line 220:
```tsx
Saving photo...
```

Source line 225:
```tsx
Photo added
```

Source line 230:
```tsx
Align face inside the guide
```

Source line 248:
```tsx
Flip
```

## Styles

Source line 268:
```tsx
styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  centerPanel: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  panelText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  permissionBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 180,
    alignItems: "center",
  },
  permissionBtnText: {
    color: "#0F172A",
    fontWeight: "800",
  },
  linkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkBtnText: {
    color: "#E2E8F0",
    fontWeight: "700",
  },
  topBar: {
    position: "absolute",
    top: 62,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  topAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: {
    flex: 1,
    paddingTop: 2,
    gap: 4,
  },
  topSpacer: {
    width: 44,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#D9E4F0",
    fontSize: 14,
    lineHeight: 20,
  },
  cameraWindow: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  focusRing: {
    position: "absolute",
    borderWidth: 4,
    backgroundColor: "transparent",
  },
  statusBadge: {
    position: "absolute",
    minWidth: 172,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 12,
  },
  errorBanner: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(127,29,29,0.9)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorBannerText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  secondaryAction: {
    width: 86,
    alignItems: "center",
    gap: 6,
  },
  secondaryActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  captureButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.65)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionGhost: {
    width: 86,
    alignItems: "flex-end",
  },
  secondaryHint: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
})
```

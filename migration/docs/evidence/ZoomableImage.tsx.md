# ZoomableImage.tsx

Source: `mobile-app/src/components/ZoomableImage.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 126:
```tsx
useState(false)
```

## Form controls and modal declarations

Source line 108:
```tsx
<Pressable style={[styles.resetButton, { bottom: insets.bottom + 18 }]} onPress={resetZoom}>
```

Source line 135:
```tsx
<Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={previewTitle ? `Open ${previewTitle} image preview` : "Open image preview"}
        onPress={(event) => {
          event.stopPropagation();
          setVisible(true);
        }}
        style={containerStyle}
      >
```

Source line 147:
```tsx
<Modal visible={visible} transparent animationType={transition} onRequestClose={() => setVisible(false)}>
```

Source line 149:
```tsx
<Pressable style={[styles.closeButton, { top: insets.top + 12 }]} onPress={() => setVisible(false)} hitSlop={12}>
```

## Conditional behavior

Source line 59:
```tsx
if (scale.value <= 1.02) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
```

Source line 71:
```tsx
if (scale.value <= 1) return;
```

Source line 87:
```tsx
if (nextScale === 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
```

Source line 129:
```tsx
if (disabled) {
    return <Image source={source} style={imageStyle} resizeMode={resizeMode} />;
  }
```

## Visible text

Source line 110:
```tsx
Reset
```

## Styles

Source line 159:
```tsx
styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(6, 12, 24, 0.94)" },
  closeButton: {
    position: "absolute",
    right: 18,
    top: 18,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  previewTitle: {
    position: "absolute",
    left: 76,
    right: 76,
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  previewImageFrame: { width: "100%", height: "82%", alignItems: "center", justifyContent: "center" },
  previewImage: { width: "100%", height: "100%" },
  resetButton: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  resetText: { color: "white", fontWeight: "800" },
})
```

# DatePickerField.tsx

Source: `mobile-app/src/components/DatePickerField.tsx`. Generated AST evidence, not runtime verification.

## Data, state, navigation, and side effects

Source line 78:
```tsx
useState(false)
```

Source line 79:
```tsx
useState(() => normalizeMonth(value))
```

## Form controls and modal declarations

Source line 97:
```tsx
<Pressable style={styles.field} onPress={() => setShowModal(true)}>
```

Source line 101:
```tsx
<TouchableOpacity
            onPress={() => onChange("")}
            hitSlop={8}
            style={styles.clearBtn}
          >
```

Source line 111:
```tsx
<Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
```

Source line 115:
```tsx
<TouchableOpacity onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} hitSlop={12}>
```

Source line 121:
```tsx
<TouchableOpacity onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} hitSlop={12}>
```

Source line 139:
```tsx
<TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayCell,
                      selected && styles.dayCellSelected,
                      day.isPast && styles.dayCellDisabled,
                      outside && styles.dayCellOutside,
                    ]}
                    disabled={day.isPast}
                    onPress={() => {
                      onChange(day.iso);
                      setShowModal(false);
                    }}
                  >
```

Source line 169:
```tsx
<Pressable style={[styles.actionBtn, styles.todayBtn]} onPress={selectToday}>
```

Source line 172:
```tsx
<Pressable style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => setShowModal(false)}>
```

## Conditional behavior

Source line 24:
```tsx
if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
  }
```

Source line 26:
```tsx
if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
```

Source line 89:
```tsx
if (!showModal) {
      setCalendarMonth(normalizeMonth(value));
    }
```

## Visible text

Source line 170:
```tsx
Today
```

Source line 173:
```tsx
Close
```

## Styles

Source line 183:
```tsx
styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", color: "#35506B", marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#D5E2F2",
    borderRadius: 10,
    backgroundColor: "#FBFDFF",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  value: { fontSize: 14, color: "#1B365D", flex: 1 },
  placeholder: { color: "#767F8B" },
  clearBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontWeight: "800", color: "#1B365D", fontSize: 16 },
  weekRow: { flexDirection: "row", marginTop: 6 },
  weekLabel: { width: "14.2857%", textAlign: "center", color: "#5A6E86", fontSize: 12, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  dayCell: {
    width: "14.2857%",
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E9F5",
    backgroundColor: "#F9FBFF",
  },
  dayCellSelected: { borderColor: "#1F7A4F", backgroundColor: "#E7F5EC" },
  dayCellOutside: { borderColor: "#EEF1F6", backgroundColor: "#F7F9FC" },
  dayCellDisabled: { opacity: 0.35 },
  dayText: { color: "#1B365D", fontWeight: "700" },
  dayTextSelected: { color: "#1F7A4F" },
  dayTextDisabled: { color: "#767F8B" },
  dayTextOutside: { color: "#A7B3C5" },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 8 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", minWidth: 90 },
  todayBtn: { backgroundColor: "#E7F5EC", borderWidth: 1, borderColor: "#B8E3CB" },
  todayText: { color: "#1F7A4F", fontWeight: "800" },
  secondaryBtn: { backgroundColor: "#F4F7FB", borderWidth: 1, borderColor: "#DCE6F2" },
  secondaryText: { color: "#35506B", fontWeight: "700" },
})
```

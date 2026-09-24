import { startOfMonth, startOfWeek, startOfYear, format } from "date-fns";
import { Input } from "./Input";
import { Button } from "./Button";

export interface DateRange {
  from: string | null;
  to: string | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const toIso = (d: Date) => format(d, "yyyy-MM-dd");

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const today = new Date();

  const presets: Array<{ label: string; range: DateRange }> = [
    { label: "Today", range: { from: toIso(today), to: toIso(today) } },
    { label: "This week", range: { from: toIso(startOfWeek(today)), to: toIso(today) } },
    { label: "This month", range: { from: toIso(startOfMonth(today)), to: toIso(today) } },
    { label: "This year", range: { from: toIso(startOfYear(today)), to: toIso(today) } },
  ];

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        label="From"
        type="date"
        value={value.from ?? ""}
        onChange={(e) => onChange({ ...value, from: e.target.value || null })}
      />
      <Input
        label="To"
        type="date"
        value={value.to ?? ""}
        onChange={(e) => onChange({ ...value, to: e.target.value || null })}
      />
      <div className="flex gap-1 pb-0.5">
        {presets.map((preset) => (
          <Button key={preset.label} variant="secondary" size="sm" onClick={() => onChange(preset.range)}>
            {preset.label}
          </Button>
        ))}
        {(value.from || value.to) && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ from: null, to: null })}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

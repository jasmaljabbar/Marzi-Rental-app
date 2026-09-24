import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { currency } from "../../utils/format";

export interface BreakdownRow {
  category: string;
  amount: number;
}

// Single-series magnitude comparison across categories — one flat brand hue
// (not a per-category palette, since color isn't carrying identity here;
// the axis labels already do that) with direct value labels via tooltip.
export function CategoryBreakdownChart({ data }: { data: BreakdownRow[] }) {
  const { resolvedTheme } = useTheme();
  const axisColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";
  const gridColor = resolvedTheme === "dark" ? "#1e293b" : "#e2e8f0";

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={gridColor} />
        <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis type="category" dataKey="category" width={110} tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value) => currency(Number(value))}
          contentStyle={{ background: resolvedTheme === "dark" ? "#0f172a" : "#fff", border: `1px solid ${gridColor}`, fontSize: 12 }}
        />
        <Bar dataKey="amount" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

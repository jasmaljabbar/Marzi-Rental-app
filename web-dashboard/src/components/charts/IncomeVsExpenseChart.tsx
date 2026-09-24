import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { currency } from "../../utils/format";

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

// Two fixed-order categorical series (Income, Expense — never reordered).
// Validated with scripts/validate_palette.js against both chart surfaces:
// all checks pass in light and dark with this exact pair, no relief needed.
const INCOME_COLOR = "#059669";
const EXPENSE_COLOR = "#dc2626";

export function IncomeVsExpenseChart({ data }: { data: TrendPoint[] }) {
  const { resolvedTheme } = useTheme();
  const axisColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";
  const gridColor = resolvedTheme === "dark" ? "#1e293b" : "#e2e8f0";
  const surface = resolvedTheme === "dark" ? "#0f172a" : "#fff";

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
        <Tooltip
          formatter={(value) => currency(Number(value))}
          contentStyle={{ background: surface, border: `1px solid ${gridColor}`, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

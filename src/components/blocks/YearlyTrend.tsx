"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LineMonthData, LineNumber } from "@/lib/types";
import { MONTH_NAMES_RU_SHORT } from "@/lib/line-mapping";
import { Card } from "../Card";

export type TrendSeries = { id: LineNumber; label: string; data: LineMonthData };

// Цвета по порядку линий: выход (столбцы) и простои (линии).
const OUTPUT_COLORS = ["#2563eb", "#8b5cf6", "#0ea5e9"];
const DOWN_COLORS = ["#f59e0b", "#10b981", "#ef4444"];

export function YearlyTrend({ series }: { series: TrendSeries[] }) {
  const multi = series.length > 1;

  const rows = MONTH_NAMES_RU_SHORT.map((short, i) => {
    const monthNum = i + 1;
    const row: Record<string, number | string | null> = { name: short.toUpperCase() };
    for (const s of series) {
      const m = s.data.monthly?.byMonth.find((x) => x.monthNumber === monthNum);
      row[`out_${s.id}`] = m?.outputM2 ?? null;
      row[`down_${s.id}`] = m?.downtimeMin ?? null;
    }
    return row;
  });

  return (
    <Card title="Блок 2 · Годовой тренд (помесячная динамика)">
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "м²", angle: -90, position: "insideLeft", style: { fontSize: 12 } }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: "мин", angle: 90, position: "insideRight", style: { fontSize: 12 } }} />
            <Tooltip
              formatter={(value) => (typeof value === "number" ? value.toLocaleString("ru-RU") : String(value ?? ""))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s, index) => (
              <Bar
                key={`out_${s.id}`}
                yAxisId="left"
                dataKey={`out_${s.id}`}
                name={multi ? `${s.label} — выход м²` : "Выход м²"}
                fill={OUTPUT_COLORS[index % OUTPUT_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
            {series.map((s, index) => (
              <Line
                key={`down_${s.id}`}
                yAxisId="right"
                type="monotone"
                dataKey={`down_${s.id}`}
                name={multi ? `${s.label} — простои мин` : "Простои мин"}
                stroke={DOWN_COLORS[index % DOWN_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {series.map((s) => (
          <Stat
            key={`stat_out_${s.id}`}
            label={multi ? `${s.label} — год м²` : "Итого за год, м²"}
            value={(s.data.monthly?.totals.outputM2 ?? 0).toLocaleString("ru-RU")}
          />
        ))}
        {series.map((s) => (
          <Stat
            key={`stat_down_${s.id}`}
            label={multi ? `${s.label} — год простои мин` : "Простои за год, мин"}
            value={(s.data.monthly?.totals.downtimeMin ?? 0).toLocaleString("ru-RU")}
          />
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

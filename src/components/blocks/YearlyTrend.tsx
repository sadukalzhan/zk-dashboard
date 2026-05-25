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
import type { LineMonthData } from "@/lib/types";
import { MONTH_NAMES_RU_SHORT } from "@/lib/line-mapping";
import { Card } from "../Card";

export function YearlyTrend({
  primary,
  secondary,
}: {
  primary: LineMonthData;
  secondary?: LineMonthData;
}) {
  const months = MONTH_NAMES_RU_SHORT.map((short, i) => ({
    name: short.toUpperCase(),
    monthNum: i + 1,
  }));

  const data = months.map(({ name, monthNum }) => {
    const p = primary.monthly?.byMonth.find((m) => m.monthNumber === monthNum);
    const s = secondary?.monthly?.byMonth.find((m) => m.monthNumber === monthNum);
    const row: Record<string, number | string | null> = { name };
    row["L1_output"] = p?.outputM2 ?? null;
    row["L1_down"] = p?.downtimeMin ?? null;
    if (secondary) {
      row["L2_output"] = s?.outputM2 ?? null;
      row["L2_down"] = s?.downtimeMin ?? null;
    }
    return row;
  });

  return (
    <Card title="Блок 2 · Годовой тренд (помесячная динамика)">
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "м²", angle: -90, position: "insideLeft", style: { fontSize: 12 } }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: "мин", angle: 90, position: "insideRight", style: { fontSize: 12 } }} />
            <Tooltip
              formatter={(value) => (typeof value === "number" ? value.toLocaleString("ru-RU") : String(value ?? ""))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="L1_output" name={secondary ? "Линия 1 — выход м²" : "Выход м²"} fill="#2563eb" radius={[4, 4, 0, 0]} />
            {secondary && (
              <Bar yAxisId="left" dataKey="L2_output" name="Линия 2 — выход м²" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            )}
            <Line yAxisId="right" type="monotone" dataKey="L1_down" name={secondary ? "Линия 1 — простои мин" : "Простои мин"} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            {secondary && (
              <Line yAxisId="right" type="monotone" dataKey="L2_down" name="Линия 2 — простои мин" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label={secondary ? "Линия 1 — год м²" : "Итого за год, м²"} value={(primary.monthly?.totals.outputM2 ?? 0).toLocaleString("ru-RU")} />
        <Stat label={secondary ? "Линия 1 — год простои мин" : "Простои за год, мин"} value={(primary.monthly?.totals.downtimeMin ?? 0).toLocaleString("ru-RU")} />
        {secondary && (
          <>
            <Stat label="Линия 2 — год м²" value={(secondary.monthly?.totals.outputM2 ?? 0).toLocaleString("ru-RU")} />
            <Stat label="Линия 2 — год простои мин" value={(secondary.monthly?.totals.downtimeMin ?? 0).toLocaleString("ru-RU")} />
          </>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

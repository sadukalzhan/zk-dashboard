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
import type { FinanceData } from "@/lib/types";
import { Card } from "../Card";

const MONTH_NAMES_SHORT = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];

export function MonthlyChart({ data }: { data: FinanceData }) {
  const pl = data.pl;
  const rev = pl?.revenue?.values ?? new Array(12).fill(0);
  const cogs = pl?.cogs?.values ?? new Array(12).fill(0);
  const gross = pl?.grossProfit?.values ?? new Array(12).fill(0);
  const net = pl?.netProfit?.values ?? new Array(12).fill(0);
  const margin = pl?.margins.netMarginPct ?? new Array(12).fill(0);

  const rows = MONTH_NAMES_SHORT.map((name, i) => ({
    name,
    revenue: rev[i] || 0,
    cogs: cogs[i] || 0,
    gross: gross[i] || 0,
    net: net[i] || 0,
    netMarginPct: (margin[i] || 0) * 100,
  }));

  return (
    <Card title="Блок 2 · Помесячная динамика (выручка, себестоимость, прибыль)">
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatMillions(v)}
              label={{ value: "млн ₸", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              label={{ value: "%", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
            />
            <Tooltip
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : Number(value);
                if (typeof name === "string" && name.includes("маржа")) {
                  return [`${v.toFixed(1)} %`, name];
                }
                return [formatTooltip(v), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="revenue" name="Выручка" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="cogs" name="Себестоимость" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="net" name="Чистая прибыль" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="netMarginPct" name="Чистая маржа, %" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function formatMillions(value: number): string {
  if (!value) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} млрд`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} млн`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} тыс`;
  return value.toLocaleString("ru-RU");
}

function formatTooltip(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₸`;
}

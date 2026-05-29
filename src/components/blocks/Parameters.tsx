"use client";

import type { LineMonthData } from "@/lib/types";
import { Card } from "../Card";
import { formatNumber, formatPct } from "../format";

export function Parameters({ data, compareWith }: { data: LineMonthData; compareWith?: LineMonthData }) {
  const p = data.parameters;
  const c = compareWith?.parameters;

  const rows = [
    { label: "Цикл пресса, мин", primary: p?.pressCycleMin, secondary: c?.pressCycleMin, decimals: 1 },
    { label: "Цикл обжига, мин", primary: p?.kilnCycleMin, secondary: c?.kilnCycleMin, decimals: 0 },
    { label: "Температура обжига, °C", primary: p?.kilnTemperatureC, secondary: c?.kilnTemperatureC, decimals: 0 },
  ];

  return (
    <Card title="Блок 6 · Технические параметры смены">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Параметр</th>
            <th className="px-3 py-2 text-right">{compareWith ? "Линия 1" : "Среднее за месяц"}</th>
            {compareWith && <th className="px-3 py-2 text-right">Линия 2</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-3 py-2 font-medium text-slate-700">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.primary === undefined ? "—" : formatNumber(r.primary, { decimals: r.decimals })}
              </td>
              {compareWith && (
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.secondary === undefined ? "—" : formatNumber(r.secondary, { decimals: r.decimals })}
                </td>
              )}
            </tr>
          ))}
          <tr>
            <td className="px-3 py-2 font-medium text-slate-700">ОЕЕ, %</td>
            <td className="px-3 py-2 text-right tabular-nums">{p?.oee !== undefined ? formatPct(p.oee * 100, 1) : "—"}</td>
            {compareWith && (
              <td className="px-3 py-2 text-right tabular-nums">{c?.oee !== undefined ? formatPct(c.oee * 100, 1) : "—"}</td>
            )}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

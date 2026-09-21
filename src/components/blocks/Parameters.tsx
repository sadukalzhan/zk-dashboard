"use client";

import type { LineMonthData, LineNumber } from "@/lib/types";
import { Card } from "../Card";
import { formatNumber, formatPct } from "../format";

export type ParamsSeries = { id: LineNumber; label: string; data: LineMonthData };

export function Parameters({ series }: { series: ParamsSeries[] }) {
  const multi = series.length > 1;

  const rows = [
    { label: "Цикл пресса, мин", pick: (d: LineMonthData) => d.parameters?.pressCycleMin, decimals: 1 },
    { label: "Цикл обжига, мин", pick: (d: LineMonthData) => d.parameters?.kilnCycleMin, decimals: 0 },
    { label: "Температура обжига, °C", pick: (d: LineMonthData) => d.parameters?.kilnTemperatureC, decimals: 0 },
  ];

  return (
    <Card title="Блок 6 · Технические параметры смены">
      <div className="min-w-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Параметр</th>
              {series.map((s) => (
                <th key={s.id} className="px-3 py-2 text-right">
                  {multi ? s.label : "Среднее за месяц"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-3 py-2 font-medium text-slate-700">{r.label}</td>
                {series.map((s) => {
                  const value = r.pick(s.data);
                  return (
                    <td key={s.id} className="px-3 py-2 text-right tabular-nums">
                      {value === undefined ? "—" : formatNumber(value, { decimals: r.decimals })}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2 font-medium text-slate-700">ОЕЕ, %</td>
              {series.map((s) => (
                <td key={s.id} className="px-3 py-2 text-right tabular-nums">
                  {s.data.parameters?.oee !== undefined ? formatPct(s.data.parameters.oee * 100, 1) : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DowntimeArea, LineMonthData } from "@/lib/types";
import { topReasons } from "@/lib/sheets/parsers/downtime";
import { Card } from "../Card";
import { formatNumber } from "../format";

const AREA_LABELS: Record<DowntimeArea, string> = {
  press: "Пресс",
  lg: "Линия глазурования",
  kiln: "Печь",
  rectification: "Ректификация",
  sortingPacking: "Сортировка/упаковка",
};

const AREA_COLORS: Record<DowntimeArea, string> = {
  press: "#2563eb",
  lg: "#10b981",
  kiln: "#f59e0b",
  rectification: "#a855f7",
  sortingPacking: "#ef4444",
};

export function DowntimeByArea({ data }: { data: LineMonthData }) {
  const entries = (Object.entries(data.downtime) as Array<[DowntimeArea, typeof data.downtime[DowntimeArea]]>).filter(
    (e): e is [DowntimeArea, NonNullable<typeof e[1]>] => !!e[1],
  );

  const pieData = entries.map(([area, d]) => ({
    name: AREA_LABELS[area],
    value: d.totals.total,
    color: AREA_COLORS[area],
  }));

  const grandTotal = pieData.reduce((s, x) => s + x.value, 0);

  // Top-10 reasons across all areas
  const reasons: Array<{ label: string; minutes: number; area: DowntimeArea }> = [];
  for (const [area, d] of entries) {
    for (const r of topReasons(d, 15)) {
      reasons.push({ label: r.label, minutes: r.minutes, area });
    }
  }
  reasons.sort((a, b) => b.minutes - a.minutes);
  const top10 = reasons.slice(0, 10);
  const maxReason = top10[0]?.minutes ?? 1;

  return (
    <Card title="Блок 3 · Анализ простоев по участкам">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={48} outerRadius={88} paddingAngle={1}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${formatNumber(Number(v))} мин`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-slate-500">Всего простоев: {formatNumber(grandTotal)} мин</div>
        </div>

        <div className="overflow-x-auto lg:col-span-2">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Участок</th>
                <th className="px-3 py-2 text-right">Механические</th>
                <th className="px-3 py-2 text-right">Электрические</th>
                <th className="px-3 py-2 text-right">Организационные</th>
                <th className="px-3 py-2 text-right">Итого, мин</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(([area, d]) => (
                <tr key={area}>
                  <td className="px-3 py-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: AREA_COLORS[area] }} /> {AREA_LABELS[area]}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.totals.mechanical)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.totals.electrical)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(d.totals.organizational)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(d.totals.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Топ-10 причин простоев</h3>
            {top10.length === 0 ? (
              <p className="text-sm text-slate-500">Нет данных о причинах простоев.</p>
            ) : (
              <div className="space-y-2">
                {top10.map((r, i) => (
                  <div key={`${r.area}-${r.label}-${i}`} className="grid grid-cols-[2fr_1fr] items-center gap-3">
                    <div className="truncate text-sm">
                      <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: AREA_COLORS[r.area] }} /> {r.label}
                      <span className="ml-2 text-xs text-slate-400">({AREA_LABELS[r.area]})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                        <div
                          className="h-full"
                          style={{ width: `${(r.minutes / maxReason) * 100}%`, backgroundColor: AREA_COLORS[r.area] }}
                        />
                      </div>
                      <div className="w-20 text-right text-sm tabular-nums">{formatNumber(r.minutes)} мин</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

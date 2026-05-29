"use client";

import type { LineMonthData } from "@/lib/types";
import { Card } from "../Card";
import { formatNumber, formatPct } from "../format";

export function Losses({ data, compareWith }: { data: LineMonthData; compareWith?: LineMonthData }) {
  return (
    <Card title="Блок 5 · Потери по переделам">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Передел</th>
              <th className="px-3 py-2 text-right">Вход, м²</th>
              <th className="px-3 py-2 text-right">Выход, м²</th>
              <th className="px-3 py-2 text-right">Потери, м²</th>
              <th className="px-3 py-2 text-right">Потери, %</th>
              {compareWith && <th className="px-3 py-2 text-right">Разница, м²</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.losses.map((row, i) => {
              const cmp = compareWith?.losses[i];
              const diff = cmp ? row.lossesM2 - cmp.lossesM2 : null;
              return (
                <tr key={row.stage}>
                  <td className="px-3 py-2 font-medium text-slate-700">{row.stage}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.inM2, { decimals: 1 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.outM2, { decimals: 1 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.lossesM2, { decimals: 1 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.lossesPct)}</td>
                  {compareWith && (
                    <td className={`px-3 py-2 text-right tabular-nums ${diff && diff > 0 ? "text-rose-600" : diff && diff < 0 ? "text-emerald-600" : ""}`}>
                      {diff === null ? "—" : (diff > 0 ? "+" : "") + formatNumber(diff, { decimals: 1 })}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Технологическая цепочка: Пресс → Сушилка → Линия глазурования → Печь → Ректификация → Сортировка → Склад
      </p>
    </Card>
  );
}

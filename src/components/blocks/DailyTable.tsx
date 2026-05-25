"use client";

import { useMemo, useState } from "react";
import type { LineMonthData } from "@/lib/types";
import { Card } from "../Card";
import { formatNumber } from "../format";

export function DailyTable({ data }: { data: LineMonthData }) {
  const [filter, setFilter] = useState<"all" | "day" | "night">("all");

  const rows = useMemo(() => {
    return data.shifts
      .filter((s) => filter === "all" || s.shift === filter)
      .sort((a, b) => a.day - b.day || (a.shift === "day" ? -1 : 1));
  }, [data.shifts, filter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, s) => {
        acc.press += s.press.totalM2;
        acc.lgIn += s.lg.inM2;
        acc.lgOut += s.lg.outM2;
        acc.kilnIn += s.kiln.inM2;
        acc.kilnOut += s.kiln.outM2;
        acc.down += s.press.downMin + s.lg.downMin + s.kiln.downMin;
        return acc;
      },
      { press: 0, lgIn: 0, lgOut: 0, kilnIn: 0, kilnOut: 0, down: 0 },
    );
  }, [rows]);

  return (
    <Card
      title="Блок 7 · Детальная таблица по дням"
      rightSlot={
        <div className="flex gap-1">
          {(["all", "day", "night"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2 py-1 text-xs ${
                filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f === "all" ? "Все смены" : f === "day" ? "Только день" : "Только ночь"}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Дата</th>
              <th className="px-3 py-2 text-left">Смена</th>
              <th className="px-3 py-2 text-right">Пресс, м²</th>
              <th className="px-3 py-2 text-right">ЛГ вх</th>
              <th className="px-3 py-2 text-right">ЛГ вых</th>
              <th className="px-3 py-2 text-right">Печь вх</th>
              <th className="px-3 py-2 text-right">Печь вых</th>
              <th className="px-3 py-2 text-right">Простои, мин</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => {
              const down = s.press.downMin + s.lg.downMin + s.kiln.downMin;
              return (
                <tr key={`${s.day}-${s.shift}`}>
                  <td className="px-3 py-1.5">{s.date ? formatDate(s.date) : `${s.day}`}</td>
                  <td className="px-3 py-1.5">{s.shift === "day" ? "День" : "Ночь"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(s.press.totalM2, { decimals: 1 })}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(s.lg.inM2, { decimals: 1 })}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(s.lg.outM2, { decimals: 1 })}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(s.kiln.inM2, { decimals: 1 })}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(s.kiln.outM2, { decimals: 1 })}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(down)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50">
            <tr>
              <td className="px-3 py-2 font-semibold" colSpan={2}>Итого</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(totals.press, { decimals: 1 })}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(totals.lgIn, { decimals: 1 })}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(totals.lgOut, { decimals: 1 })}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(totals.kilnIn, { decimals: 1 })}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(totals.kilnOut, { decimals: 1 })}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatNumber(totals.down)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

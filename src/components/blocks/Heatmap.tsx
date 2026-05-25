"use client";

import { useState } from "react";
import type { DowntimeArea, LineMonthData } from "@/lib/types";
import { Card } from "../Card";
import { formatNumber } from "../format";

const AREAS: { area: DowntimeArea | "all"; label: string }[] = [
  { area: "all", label: "Все" },
  { area: "press", label: "Пресс" },
  { area: "lg", label: "ЛГ" },
  { area: "kiln", label: "Печь" },
  { area: "rectification", label: "Ректификация" },
];

export function Heatmap({ data }: { data: LineMonthData }) {
  const [selected, setSelected] = useState<DowntimeArea | "all">("all");

  // Build per-day day/night values
  const dayCount = 31;
  const cells: { day: number; dayMin: number; nightMin: number }[] = Array.from({ length: dayCount }, (_, i) => ({
    day: i + 1,
    dayMin: 0,
    nightMin: 0,
  }));

  const sources = selected === "all"
    ? data.heatmap
    : data.heatmap.filter((h) => h.area === selected);

  for (const src of sources) {
    for (const d of src.days) {
      const c = cells[d.day - 1];
      if (c) {
        c.dayMin += d.dayMin;
        c.nightMin += d.nightMin;
      }
    }
  }

  const maxValue = Math.max(1, ...cells.flatMap((c) => [c.dayMin, c.nightMin]));

  const colorFor = (v: number) => {
    if (v <= 0) return "bg-slate-50";
    const ratio = Math.min(1, v / maxValue);
    if (ratio < 0.15) return "bg-rose-100";
    if (ratio < 0.3) return "bg-rose-200";
    if (ratio < 0.5) return "bg-rose-300";
    if (ratio < 0.7) return "bg-rose-400 text-white";
    if (ratio < 0.85) return "bg-rose-500 text-white";
    return "bg-rose-600 text-white";
  };

  return (
    <Card
      title="Блок 4 · Тепловая карта посменных простоев"
      rightSlot={
        <div className="flex gap-1">
          {AREAS.map((a) => (
            <button
              key={a.area}
              onClick={() => setSelected(a.area)}
              className={`rounded-md px-2 py-1 text-xs ${
                selected === a.area
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[60px_repeat(31,minmax(28px,1fr))] gap-1 text-xs">
            <div />
            {cells.map((c) => (
              <div key={c.day} className="text-center text-[10px] text-slate-500">{c.day}</div>
            ))}
            <div className="flex items-center text-[11px] font-medium text-slate-600">День</div>
            {cells.map((c) => (
              <div
                key={`d-${c.day}`}
                title={`${c.day} день — ${formatNumber(c.dayMin)} мин`}
                className={`flex items-center justify-center rounded ${colorFor(c.dayMin)} h-8 text-[10px] tabular-nums`}
              >
                {c.dayMin > 0 ? formatNumber(c.dayMin) : ""}
              </div>
            ))}
            <div className="flex items-center text-[11px] font-medium text-slate-600">Ночь</div>
            {cells.map((c) => (
              <div
                key={`n-${c.day}`}
                title={`${c.day} ночь — ${formatNumber(c.nightMin)} мин`}
                className={`flex items-center justify-center rounded ${colorFor(c.nightMin)} h-8 text-[10px] tabular-nums`}
              >
                {c.nightMin > 0 ? formatNumber(c.nightMin) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        Шкала:
        <span className="h-3 w-5 bg-rose-100" />
        <span className="h-3 w-5 bg-rose-300" />
        <span className="h-3 w-5 bg-rose-500" />
        <span className="h-3 w-5 bg-rose-600" />
        <span>от 0 до {formatNumber(maxValue)} мин</span>
      </div>
    </Card>
  );
}

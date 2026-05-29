"use client";

import type { LineMonthData } from "@/lib/types";
import { formatDelta, formatNumber, formatPct } from "../format";
import { Card } from "../Card";

type KpiCardProps = {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: string; positive: boolean | null };
  accent?: "blue" | "amber" | "emerald" | "rose" | "violet";
};

const ACCENT: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  blue: "border-[#dcdde3] bg-[#f4f7fb]",
  amber: "border-[#f4c7a8] bg-[#fff4ed]",
  emerald: "border-emerald-100 bg-emerald-50",
  rose: "border-rose-100 bg-rose-50",
  violet: "border-[#c1c5cd] bg-[#eef2f6]",
};

function Card1({ label, value, sub, delta, accent = "blue" }: KpiCardProps) {
  return (
    <div className={`rounded-lg border ${ACCENT[accent]} p-4 shadow-[0_12px_28px_rgba(25,37,55,0.05)]`}>
      <div className="text-xs font-semibold uppercase text-[#6f8aac]">{label}</div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-[#192537]">{value}</div>
      <div className="mt-2 flex min-h-4 items-center gap-2 text-xs text-[#6f8aac]">
        {sub && <span>{sub}</span>}
        {delta && delta.value !== "—" && (
          <span
            className={
              delta.positive === null
                ? "text-slate-400"
                : delta.positive
                  ? "text-emerald-600"
                  : "text-[#ee5c25]"
            }
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}

export function KpiCards({ data }: { data: LineMonthData }) {
  const kpi = data.kpi;
  const out = kpi?.outputM2;
  const prevOut = kpi?.outputPrevM2;
  const delta = formatDelta(out, prevOut);
  const total = (kpi?.aClassM2 ?? 0) + (kpi?.bClassM2 ?? 0) + (kpi?.defectM2 ?? 0);

  return (
    <Card title="Блок 1 · Ключевые показатели">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card1
          label="Выход печи"
          value={formatNumber(out, { suffix: "м²" })}
          sub="за выбранный месяц"
          delta={out !== undefined ? { value: delta.value, positive: delta.positive } : undefined}
          accent="blue"
        />
        <Card1
          label="Суммарные простои"
          value={formatNumber(kpi?.downtimeMin, { suffix: "мин" })}
          sub="по всем участкам"
          accent="amber"
        />
        <Card1
          label="ОЕЕ"
          value={kpi?.oee !== undefined ? formatPct((kpi.oee ?? 0) * 100, 1) : "—"}
          sub="средний по сменам"
          accent="violet"
        />
        <Card1
          label="А класс"
          value={formatNumber(kpi?.aClassM2, { suffix: "м²" })}
          sub={total ? formatPct(((kpi?.aClassM2 ?? 0) / total) * 100) : undefined}
          accent="emerald"
        />
        <Card1
          label="В класс"
          value={formatNumber(kpi?.bClassM2, { suffix: "м²" })}
          sub={total ? formatPct(((kpi?.bClassM2 ?? 0) / total) * 100) : undefined}
          accent="blue"
        />
        <Card1
          label="Брак"
          value={formatNumber(kpi?.defectM2, { suffix: "м²" })}
          sub={total ? formatPct(((kpi?.defectM2 ?? 0) / total) * 100) : undefined}
          accent="rose"
        />
      </div>
    </Card>
  );
}

"use client";

import type { FinanceData } from "@/lib/types";
import { formatNumber, formatPct } from "../format";
import { Card } from "../Card";

type KpiCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "amber" | "emerald" | "rose" | "violet" | "slate";
};

const ACCENT: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  blue: "border-[#dcdde3] bg-[#f4f7fb]",
  amber: "border-[#f4c7a8] bg-[#fff4ed]",
  emerald: "border-emerald-100 bg-emerald-50",
  rose: "border-rose-100 bg-rose-50",
  violet: "border-[#c1c5cd] bg-[#eef2f6]",
  slate: "border-[#dcdde3] bg-white",
};

function Card1({ label, value, sub, accent = "blue" }: KpiCardProps) {
  return (
    <div className={`rounded-lg border ${ACCENT[accent]} p-4 shadow-[0_12px_28px_rgba(25,37,55,0.05)]`}>
      <div className="text-xs font-semibold uppercase text-[#6f8aac]">{label}</div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-[#192537]">{value}</div>
      {sub && <div className="mt-2 text-xs text-[#6f8aac]">{sub}</div>}
    </div>
  );
}

// Format big KZT numbers in millions (млн ₸) or thousands (тыс ₸) for readability.
function formatMoney(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, { decimals: 2 })} млрд ₸`;
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, { decimals: 1 })} млн ₸`;
  if (abs >= 1_000) return `${formatNumber(value / 1_000, { decimals: 0 })} тыс ₸`;
  return `${formatNumber(value)} ₸`;
}

export function FinanceKpi({ data, monthIndex }: { data: FinanceData; monthIndex?: number }) {
  const pl = data.pl;
  if (!pl) {
    return (
      <Card title="Финансовые показатели">
        <div className="text-sm text-slate-500">Нет данных. Подключите финансовую таблицу в настройках.</div>
      </Card>
    );
  }

  const idx = typeof monthIndex === "number" ? monthIndex : Math.max(0, lastNonZeroMonth(pl.revenue?.values ?? []));
  const monthName = MONTH_NAMES[idx] ?? "—";

  const revM = pl.revenue?.values[idx];
  const revY = pl.revenue?.total ?? sum(pl.revenue?.values);
  const cogsM = pl.cogs?.values[idx];
  const grossM = pl.grossProfit?.values[idx];
  const grossY = pl.grossProfit?.total ?? sum(pl.grossProfit?.values);
  const ebitM = pl.ebit?.values[idx];
  const netM = pl.netProfit?.values[idx];
  const netY = pl.netProfit?.total ?? sum(pl.netProfit?.values);

  const grossMargin = pl.margins.grossMarginPct[idx] * 100;
  const netMargin = pl.margins.netMarginPct[idx] * 100;
  const yearGrossMargin = pl.margins.yearGross * 100;
  const yearNetMargin = pl.margins.yearNet * 100;

  return (
    <Card title={`Блок 1 · Финансовые показатели (${monthName} / ${data.year})`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Card1 label="Выручка (месяц)" value={formatMoney(revM)} sub={`Год: ${formatMoney(revY)}`} accent="blue" />
        <Card1 label="Себестоимость (месяц)" value={formatMoney(cogsM)} accent="amber" />
        <Card1
          label="Валовая прибыль"
          value={formatMoney(grossM)}
          sub={`Год: ${formatMoney(grossY)}`}
          accent="emerald"
        />
        <Card1
          label="EBIT (месяц)"
          value={formatMoney(ebitM)}
          accent="violet"
        />
        <Card1
          label="Чистая прибыль"
          value={formatMoney(netM)}
          sub={`Год: ${formatMoney(netY)}`}
          accent={netM !== undefined && netM < 0 ? "rose" : "emerald"}
        />
        <Card1
          label="Валовая маржа"
          value={formatPct(grossMargin)}
          sub={`Год: ${formatPct(yearGrossMargin)}`}
          accent="slate"
        />
        <Card1
          label="Чистая маржа"
          value={formatPct(netMargin)}
          sub={`Год: ${formatPct(yearNetMargin)}`}
          accent="slate"
        />
        <Card1
          label="EBITDA маржа"
          value={formatPct(pl.margins.ebitMarginPct[idx] * 100)}
          sub={`Год: ${formatPct(pl.margins.yearEbit * 100)}`}
          accent="slate"
        />
      </div>
    </Card>
  );
}

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function lastNonZeroMonth(values: number[]): number {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i]) return i;
  }
  return 0;
}

function sum(arr?: number[]): number {
  if (!arr) return 0;
  return arr.reduce((s, x) => s + (x || 0), 0);
}

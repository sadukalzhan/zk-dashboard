"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AreaDowntime, DowntimeArea, LineMonthData } from "@/lib/types";
import { topReasons } from "@/lib/sheets/parsers/downtime";
import { Card } from "../Card";
import { formatNumber } from "../format";

const AREAS: Array<{ area: DowntimeArea; label: string }> = [
  { area: "press", label: "Пресс" },
  { area: "lg", label: "Линия глазурования" },
  { area: "kiln", label: "Печь" },
  { area: "rectification", label: "Ректификация" },
  { area: "sortingPacking", label: "Сортировка и упаковка" },
];

// Круговая диаграмма читается только при ≤ 6 секторах: топ-5 причин получают
// цвета категориальной палитры (фиксированный порядок, проверена на дальтонизм),
// остальные сворачиваются в серый сектор «Остальные». Полный список — рядом.
const TOP_SLICES = 5;
const REASON_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const OTHER_COLOR = "#c1c5cd";

const CATEGORIES: Array<{ key: "mechanical" | "electrical" | "organizational"; label: string }> = [
  { key: "mechanical", label: "Механические" },
  { key: "electrical", label: "Электрические" },
  { key: "organizational", label: "Организационные" },
];

export function DowntimeDetails({ data }: { data: LineMonthData }) {
  const areas = AREAS.filter(({ area }) => data.downtime[area]);

  return (
    <Card title="Блок 3.1 · Простои по отделам">
      {areas.length === 0 ? (
        <p className="text-sm text-[#6f8aac]">Нет данных о простоях за выбранный месяц.</p>
      ) : (
        <div className="@container">
          <div className="grid gap-4 @5xl:grid-cols-2">
            {areas.map(({ area, label }) => (
              <AreaDetail key={area} label={label} downtime={data.downtime[area]!} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function AreaDetail({ label, downtime }: { label: string; downtime: AreaDowntime }) {
  const reasons = topReasons(downtime, Number.MAX_SAFE_INTEGER).filter((r) => r.minutes > 0);
  const reasonSum = reasons.reduce((s, r) => s + r.minutes, 0);
  const share = (minutes: number) => (reasonSum > 0 ? (minutes / reasonSum) * 100 : 0);

  const top = reasons.slice(0, TOP_SLICES);
  const restMinutes = reasons.slice(TOP_SLICES).reduce((s, r) => s + r.minutes, 0);
  const slices = [
    ...top.map((r, i) => ({ name: r.label, value: r.minutes, color: REASON_COLORS[i] })),
    ...(restMinutes > 0
      ? [{ name: `Остальные (${reasons.length - TOP_SLICES})`, value: restMinutes, color: OTHER_COLOR }]
      : []),
  ];
  const colorOf = (index: number) => (index < TOP_SLICES ? REASON_COLORS[index] : OTHER_COLOR);

  const { mechanical, electrical, organizational } = downtime.totals;
  const categoryTotal = mechanical + electrical + organizational;
  const leader = top[0];

  return (
    <article className="@container min-w-0 rounded-lg border border-[#e7ebf0] bg-[#fbfcfd] p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#192537]">Простои · {label}</h3>
        <div className="shrink-0 text-xs text-[#6f8aac]">
          всего <span className="text-sm font-semibold tabular-nums text-[#192537]">{formatNumber(downtime.totals.total)}</span> мин
        </div>
      </header>

      {reasons.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6f8aac]">Простоев с указанием причины не зафиксировано.</p>
      ) : (
        <div className="grid items-start gap-4 @lg:grid-cols-[176px_minmax(0,1fr)]">
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={84}
                  startAngle={90}
                  endAngle={-270}
                  stroke="#fbfcfd"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${formatNumber(Number(value))} мин · ${pctLabel(share(Number(value)))}`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#dcdde3" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {leader && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
                <span className="text-xl font-semibold tabular-nums text-[#192537]">{pctLabel(share(leader.minutes))}</span>
                <span className="line-clamp-2 text-[11px] leading-tight text-[#6f8aac]">{leader.label}</span>
              </div>
            )}
          </div>

          <ol className="max-h-64 min-w-0 space-y-2 overflow-y-auto pr-1">
            {reasons.map((r, i) => (
              <li key={r.label} title={`${r.label}: ${formatNumber(r.minutes)} мин (${pctLabel(share(r.minutes))})`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colorOf(i) }} />
                    <span className="truncate text-sm text-[#192537]">{r.label}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[#6f8aac]">
                    <span className="font-medium text-[#192537]">{formatNumber(r.minutes)}</span> мин · {pctLabel(share(r.minutes))}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef2f6]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(share(r.minutes), 0.5)}%`, backgroundColor: colorOf(i) }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {categoryTotal > 0 && (
        <div className="mt-4 border-t border-[#e7ebf0] pt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6f8aac]">Тип простоя</div>
          <div className="space-y-1.5">
            {CATEGORIES.map(({ key, label: catLabel }) => {
              const minutes = downtime.totals[key];
              const pct = (minutes / categoryTotal) * 100;
              return (
                <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
                  <span className="text-[#192537]">{catLabel}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]">
                    <div className="h-full rounded-full bg-[#4b6b95]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-28 text-right tabular-nums text-[#6f8aac]">
                    <span className="font-medium text-[#192537]">{formatNumber(minutes)}</span> мин · {pctLabel(pct)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function pctLabel(pct: number): string {
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";
import type { AreaDowntime, DowntimeArea, LineMonthData } from "@/lib/types";
import { MONTH_NAMES_RU_SHORT } from "@/lib/line-mapping";
import { topReasons } from "@/lib/sheets/parsers/downtime";
import { formatDelta, formatNumber, formatPct } from "../format";

// Слайд — фиксированные 1280×720 (16:9): одинаково на экране, в печати и в PDF.
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

export type SlideMeta = { eyebrow: string; page: number; total: number };

const AREAS: Array<{ area: DowntimeArea; label: string; color: string }> = [
  { area: "press", label: "Пресс", color: "#2563eb" },
  { area: "lg", label: "Линия глазурования", color: "#10b981" },
  { area: "kiln", label: "Печь", color: "#f59e0b" },
  { area: "rectification", label: "Ректификация", color: "#a855f7" },
  { area: "sortingPacking", label: "Сортировка и упаковка", color: "#ef4444" },
];

// Топ-5 причин — категориальная палитра в фиксированном порядке, хвост — серый.
const REASON_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const OTHER_COLOR = "#c1c5cd";
const TOP_SLICES = 5;

// Одна шкала «светлее → темнее» для тепловой карты.
const HEAT_RAMP = ["#ffe4e6", "#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48"];

function pctLabel(pct: number): string {
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

function compact(value: number): string {
  // Неразрывный пробел: иначе подпись оси переносится на две строки.
  if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000)} тыс.`;
  return formatNumber(value);
}

// ---------- Каркас слайда ----------

export function SlideFrame({
  meta,
  title,
  aside,
  children,
}: {
  meta: SlideMeta;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-slide className="flex h-[720px] w-[1280px] flex-col overflow-hidden bg-white text-[#192537]">
      <div className="h-1.5 shrink-0 bg-[#ee5c25]" />
      <header className="flex shrink-0 items-end justify-between gap-8 px-14 pt-8">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#ee5c25]">{meta.eyebrow}</div>
          <h2 className="mt-1 text-[32px] font-semibold leading-tight">{title}</h2>
        </div>
        {aside && <div className="shrink-0 pb-1 text-right">{aside}</div>}
      </header>
      <div className="min-h-0 flex-1 px-14 pt-6">{children}</div>
      <footer className="flex shrink-0 items-center justify-between px-14 pb-5 pt-3 text-[12px] text-[#6f8aac]">
        <span>ЗК-Дашборд · ТОО «Зерде-Керамика Актобе»</span>
        <span className="tabular-nums">
          {meta.page} / {meta.total}
        </span>
      </footer>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center text-[18px] text-[#6f8aac]">{children}</div>;
}

function BigTotal({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">{label}</div>
      <div className="text-[26px] font-semibold tabular-nums leading-tight">{value}</div>
    </>
  );
}

// ---------- 1. Титульный ----------

export function TitleSlide({
  lineLabel,
  period,
  generatedAt,
}: {
  lineLabel: string;
  period: string;
  generatedAt: string;
}) {
  return (
    <div data-slide className="flex h-[720px] w-[1280px] flex-col justify-between overflow-hidden bg-[#192537] p-16 text-white">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#ee5c25] text-[20px] font-bold">ЗК</div>
        <div>
          <div className="text-[18px] font-semibold leading-tight">ЗК-Дашборд</div>
          <div className="text-[14px] leading-tight text-[#9fb3cc]">ТОО «Зерде-Керамика Актобе»</div>
        </div>
      </div>
      <div>
        <div className="text-[16px] font-semibold uppercase tracking-[0.12em] text-[#ee5c25]">Производственный отчёт</div>
        <h1 className="mt-4 text-[60px] font-semibold leading-[1.08]">{period}</h1>
        <div className="mt-5 text-[28px] leading-tight text-[#d5deea]">{lineLabel}</div>
      </div>
      <div className="flex items-center justify-between border-t border-white/15 pt-6 text-[14px] text-[#9fb3cc]">
        <span>Данные: сменные отчёты и сводная таблица Google Sheets</span>
        <span>Сформировано {generatedAt}</span>
      </div>
    </div>
  );
}

// ---------- 2. Ключевые показатели ----------

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#dcdde3] bg-[#f8fafc] px-6 py-5">
      <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">{label}</div>
      <div className="text-[40px] font-semibold tabular-nums leading-none">{value}</div>
      <div className="min-h-[20px] text-[14px] text-[#6f8aac]">{sub}</div>
    </div>
  );
}

export function KpiSlide({ meta, data }: { meta: SlideMeta; data: LineMonthData }) {
  const kpi = data.kpi;
  if (!kpi) {
    return (
      <SlideFrame meta={meta} title="Ключевые показатели">
        <Empty>Нет данных за выбранный месяц.</Empty>
      </SlideFrame>
    );
  }

  const delta = formatDelta(kpi.outputM2, kpi.outputPrevM2);
  const quality = [
    { label: "А класс", value: kpi.aClassM2, color: "#10b981" },
    { label: "В класс", value: kpi.bClassM2, color: "#f59e0b" },
    { label: "Брак", value: kpi.defectM2, color: "#ef4444" },
  ];
  const packed = quality.reduce((s, q) => s + q.value, 0);
  const share = (v: number) => (packed > 0 ? (v / packed) * 100 : 0);

  return (
    <SlideFrame meta={meta} title="Ключевые показатели">
      <div className="flex h-full flex-col gap-6">
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-5">
          <KpiTile
            label="Выход печи"
            value={formatNumber(kpi.outputM2, { suffix: "м²" })}
            sub={
              delta.positive === null ? (
                "за выбранный месяц"
              ) : (
                <>
                  <span className={delta.positive ? "text-emerald-600" : "text-[#ee5c25]"}>{delta.positive ? "▲" : "▼"}</span>{" "}
                  {delta.value} к прошлому месяцу
                </>
              )
            }
          />
          <KpiTile label="Суммарные простои" value={formatNumber(kpi.downtimeMin, { suffix: "мин" })} sub="по всем участкам" />
          <KpiTile
            label="Эффективность пресса"
            value={kpi.pressEfficiency !== undefined ? formatPct(kpi.pressEfficiency * 100, 1) : "—"}
            sub="итого за месяц"
          />
          {quality.map((q) => (
            <KpiTile
              key={q.label}
              label={q.label}
              value={formatNumber(q.value, { suffix: "м²" })}
              sub={packed > 0 ? `${formatPct(share(q.value))} от упаковки` : undefined}
            />
          ))}
        </div>

        {packed > 0 && (
          <div className="shrink-0">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">Структура упаковки</span>
              <span className="text-[14px] text-[#6f8aac]">
                всего <span className="font-semibold tabular-nums text-[#192537]">{formatNumber(packed)}</span> м²
              </span>
            </div>
            <div className="flex h-6 gap-0.5 overflow-hidden rounded">
              {quality.map((q) => (
                <div key={q.label} style={{ width: `${share(q.value)}%`, backgroundColor: q.color }} />
              ))}
            </div>
            <div className="mt-2 flex gap-8 text-[14px]">
              {quality.map((q) => (
                <span key={q.label} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: q.color }} />
                  {q.label}
                  <span className="tabular-nums text-[#6f8aac]">{formatPct(share(q.value))}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </SlideFrame>
  );
}

// ---------- 3. Динамика по месяцам ----------

function MonthBars({
  title,
  unit,
  rows,
  current,
  color,
  mutedColor,
  total,
}: {
  title: string;
  unit: string;
  rows: Array<{ name: string; value: number; monthNumber: number }>;
  current: number;
  color: string;
  mutedColor: string;
  total: number;
}) {
  const chartData = rows.map((r) => ({
    ...r,
    // Подписываем только выбранный месяц, остальные читаются по оси.
    label: r.monthNumber === current && r.value > 0 ? formatNumber(r.value) : "",
  }));

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[18px] font-semibold">
          {title}, <span className="font-normal text-[#6f8aac]">{unit}</span>
        </h3>
        <span className="text-[14px] text-[#6f8aac]">
          за год <span className="font-semibold tabular-nums text-[#192537]">{formatNumber(total)}</span> {unit}
        </span>
      </div>
      <BarChart width={564} height={450} data={chartData} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f6" />
        <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#dcdde3" }} tick={{ fontSize: 12, fill: "#6f8aac" }} />
        <YAxis tickLine={false} axisLine={false} width={76} tick={{ fontSize: 12, fill: "#6f8aac" }} tickFormatter={compact} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
          {chartData.map((r) => (
            <Cell key={r.name} fill={r.monthNumber === current ? color : mutedColor} />
          ))}
          <LabelList dataKey="label" position="top" style={{ fontSize: 13, fontWeight: 600, fill: "#192537" }} />
        </Bar>
      </BarChart>
    </div>
  );
}

export function TrendSlide({ meta, data, month }: { meta: SlideMeta; data: LineMonthData; month: number }) {
  const byMonth = data.monthly?.byMonth ?? [];
  if (!byMonth.length) {
    return (
      <SlideFrame meta={meta} title="Динамика по месяцам">
        <Empty>Нет помесячных данных.</Empty>
      </SlideFrame>
    );
  }
  const rows = (pick: "outputM2" | "downtimeMin") =>
    MONTH_NAMES_RU_SHORT.map((short, i) => ({
      name: short.toUpperCase(),
      monthNumber: i + 1,
      value: byMonth.find((m) => m.monthNumber === i + 1)?.[pick] ?? 0,
    }));

  return (
    <SlideFrame
      meta={meta}
      title="Динамика по месяцам"
      aside={<span className="text-[14px] text-[#6f8aac]">выбранный месяц выделен цветом</span>}
    >
      <div className="grid grid-cols-2 gap-10">
        <MonthBars
          title="Выход печи"
          unit="м²"
          rows={rows("outputM2")}
          current={month}
          color="#2a78d6"
          mutedColor="#b7d3f6"
          total={data.monthly?.totals.outputM2 ?? 0}
        />
        <MonthBars
          title="Простои печи"
          unit="мин"
          rows={rows("downtimeMin")}
          current={month}
          color="#eb6834"
          mutedColor="#f7cdb9"
          total={data.monthly?.totals.downtimeMin ?? 0}
        />
      </div>
    </SlideFrame>
  );
}

// ---------- 4. Простои по участкам ----------

function Donut({
  slices,
  size,
  children,
}: {
  slices: Array<{ name: string; value: number; color: string }>;
  size: number;
  children?: ReactNode;
}) {
  const outer = size / 2 - 4;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={outer * 0.64}
          outerRadius={outer}
          startAngle={90}
          endAngle={-270}
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {slices.map((s) => (
            <Cell key={s.name} fill={s.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[22%] text-center">
        {children}
      </div>
    </div>
  );
}

export function DowntimeAreasSlide({ meta, data }: { meta: SlideMeta; data: LineMonthData }) {
  const rows = AREAS.flatMap((a) => {
    const d = data.downtime[a.area];
    return d ? [{ ...a, totals: d.totals }] : [];
  });
  const grand = rows.reduce((s, r) => s + r.totals.total, 0);
  if (!rows.length || grand <= 0) {
    return (
      <SlideFrame meta={meta} title="Простои по участкам">
        <Empty>Простоев за месяц не зафиксировано.</Empty>
      </SlideFrame>
    );
  }
  const sum = (key: "mechanical" | "electrical" | "organizational") => rows.reduce((s, r) => s + r.totals[key], 0);

  return (
    <SlideFrame meta={meta} title="Простои по участкам">
      <div className="flex h-full items-center gap-12">
        <Donut size={380} slices={rows.map((r) => ({ name: r.label, value: r.totals.total, color: r.color }))}>
          <span className="text-[34px] font-semibold tabular-nums leading-none">{formatNumber(grand)}</span>
          <span className="mt-1 text-[14px] text-[#6f8aac]">мин простоев</span>
        </Donut>

        <table className="min-w-0 flex-1 text-[16px]">
          <thead>
            <tr className="border-b border-[#dcdde3] text-[12px] uppercase tracking-[0.05em] text-[#6f8aac]">
              <th className="py-3 text-left font-semibold">Участок</th>
              <th className="py-3 text-right font-semibold">Мех.</th>
              <th className="py-3 text-right font-semibold">Электр.</th>
              <th className="py-3 text-right font-semibold">Организ.</th>
              <th className="py-3 text-right font-semibold">Итого, мин</th>
              <th className="py-3 text-right font-semibold">Доля</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.area} className="border-b border-[#eef2f6]">
                <td className="py-3.5">
                  <span className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
                    {r.label}
                  </span>
                </td>
                <td className="py-3.5 text-right tabular-nums">{formatNumber(r.totals.mechanical)}</td>
                <td className="py-3.5 text-right tabular-nums">{formatNumber(r.totals.electrical)}</td>
                <td className="py-3.5 text-right tabular-nums">{formatNumber(r.totals.organizational)}</td>
                <td className="py-3.5 text-right font-semibold tabular-nums">{formatNumber(r.totals.total)}</td>
                <td className="py-3.5 text-right tabular-nums text-[#6f8aac]">{pctLabel((r.totals.total / grand) * 100)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-3.5">Всего</td>
              <td className="py-3.5 text-right tabular-nums">{formatNumber(sum("mechanical"))}</td>
              <td className="py-3.5 text-right tabular-nums">{formatNumber(sum("electrical"))}</td>
              <td className="py-3.5 text-right tabular-nums">{formatNumber(sum("organizational"))}</td>
              <td className="py-3.5 text-right tabular-nums">{formatNumber(grand)}</td>
              <td className="py-3.5 text-right tabular-nums text-[#6f8aac]">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SlideFrame>
  );
}

// ---------- 5. Топ-10 причин ----------

export function TopReasonsSlide({ meta, data }: { meta: SlideMeta; data: LineMonthData }) {
  const all = AREAS.flatMap((a) => {
    const d = data.downtime[a.area];
    return d ? topReasons(d, 15).map((r) => ({ ...r, areaLabel: a.label, color: a.color })) : [];
  })
    .filter((r) => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  if (!all.length) {
    return (
      <SlideFrame meta={meta} title="Топ-10 причин простоев">
        <Empty>Причины простоев не указаны.</Empty>
      </SlideFrame>
    );
  }
  const max = all[0].minutes;

  return (
    <SlideFrame meta={meta} title="Топ-10 причин простоев">
      <div className="flex h-full flex-col justify-between pb-1">
        {all.map((r, i) => (
          <div key={`${r.areaLabel}-${r.label}`} className="grid grid-cols-[28px_440px_minmax(0,1fr)_120px] items-center gap-4">
            <span className="text-[15px] tabular-nums text-[#6f8aac]">{i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-[17px] leading-tight">{r.label}</span>
              <span className="flex items-center gap-1.5 text-[12px] leading-tight text-[#6f8aac]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                {r.areaLabel}
              </span>
            </span>
            <div className="h-3.5 overflow-hidden rounded bg-[#eef2f6]">
              <div className="h-full rounded" style={{ width: `${(r.minutes / max) * 100}%`, backgroundColor: r.color }} />
            </div>
            <span className="text-right text-[17px] font-semibold tabular-nums">
              {formatNumber(r.minutes)} <span className="text-[13px] font-normal text-[#6f8aac]">мин</span>
            </span>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

// ---------- 6. Простои по отделу ----------

const CATEGORIES: Array<{ key: "mechanical" | "electrical" | "organizational"; label: string }> = [
  { key: "mechanical", label: "Механические" },
  { key: "electrical", label: "Электрические" },
  { key: "organizational", label: "Организационные" },
];
const LISTED_REASONS = 10;

export function AreaSlide({ meta, label, downtime }: { meta: SlideMeta; label: string; downtime: AreaDowntime }) {
  const reasons = topReasons(downtime, Number.MAX_SAFE_INTEGER).filter((r) => r.minutes > 0);
  const reasonSum = reasons.reduce((s, r) => s + r.minutes, 0);
  const share = (minutes: number) => (reasonSum > 0 ? (minutes / reasonSum) * 100 : 0);
  const colorOf = (i: number) => (i < TOP_SLICES ? REASON_COLORS[i] : OTHER_COLOR);

  const top = reasons.slice(0, TOP_SLICES);
  const restMinutes = reasons.slice(TOP_SLICES).reduce((s, r) => s + r.minutes, 0);
  const slices = [
    ...top.map((r, i) => ({ name: r.label, value: r.minutes, color: REASON_COLORS[i] })),
    ...(restMinutes > 0 ? [{ name: "Остальные", value: restMinutes, color: OTHER_COLOR }] : []),
  ];

  const listed = reasons.slice(0, LISTED_REASONS);
  const hidden = reasons.slice(LISTED_REASONS);
  const hiddenMinutes = hidden.reduce((s, r) => s + r.minutes, 0);

  const { mechanical, electrical, organizational } = downtime.totals;
  const categoryTotal = mechanical + electrical + organizational;

  return (
    <SlideFrame
      meta={meta}
      title={`Простои · ${label}`}
      aside={<BigTotal label="Всего простоев" value={`${formatNumber(downtime.totals.total)} мин`} />}
    >
      {reasons.length === 0 ? (
        <Empty>Простоев с указанием причины не зафиксировано.</Empty>
      ) : (
        <div className="grid h-full grid-cols-[340px_minmax(0,1fr)] gap-12">
          <div className="flex flex-col justify-between">
            <Donut size={300} slices={slices}>
              <span className="text-[34px] font-semibold tabular-nums leading-none">{pctLabel(share(top[0].minutes))}</span>
              <span className="mt-1.5 line-clamp-2 text-[13px] leading-tight text-[#6f8aac]">{top[0].label}</span>
            </Donut>

            {categoryTotal > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">Тип простоя</div>
                <div className="space-y-2">
                  {CATEGORIES.map(({ key, label: catLabel }) => {
                    const minutes = downtime.totals[key];
                    const pct = (minutes / categoryTotal) * 100;
                    return (
                      <div key={key} className="text-[13px]">
                        <div className="flex items-baseline justify-between">
                          <span>{catLabel}</span>
                          <span className="tabular-nums text-[#6f8aac]">
                            <span className="font-semibold text-[#192537]">{formatNumber(minutes)}</span> мин · {pctLabel(pct)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eef2f6]">
                          <div className="h-full rounded-full bg-[#4b6b95]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="mb-2 flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">
              <span>Причины простоев</span>
              <span>минуты · доля</span>
            </div>
            <ol className="flex flex-1 flex-col justify-start gap-[13px]">
              {listed.map((r, i) => (
                <li key={r.label}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colorOf(i) }} />
                      <span className="truncate text-[16px] leading-tight">{r.label}</span>
                    </span>
                    <span className="shrink-0 text-[14px] tabular-nums text-[#6f8aac]">
                      <span className="text-[16px] font-semibold text-[#192537]">{formatNumber(r.minutes)}</span> мин ·{" "}
                      {pctLabel(share(r.minutes))}
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
            {hidden.length > 0 && (
              <div className="mt-2 text-[13px] text-[#6f8aac]">
                Ещё причин: {hidden.length} — в сумме {formatNumber(hiddenMinutes)} мин ({pctLabel(share(hiddenMinutes))})
              </div>
            )}
          </div>
        </div>
      )}
    </SlideFrame>
  );
}

// ---------- 7. Тепловая карта ----------

function heatColor(value: number, max: number): { background: string; color: string } {
  if (value <= 0) return { background: "#f4f7fb", color: "#192537" };
  const step = Math.min(HEAT_RAMP.length - 1, Math.floor((value / max) * HEAT_RAMP.length));
  return { background: HEAT_RAMP[step], color: step >= 3 ? "#ffffff" : "#192537" };
}

function HeatRows({
  title,
  rows,
  days,
}: {
  title: string;
  rows: Array<{ label: string; values: number[] }>;
  days: number;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `168px repeat(${days}, minmax(0, 1fr))` }}>
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">{title}</div>
        {Array.from({ length: days }, (_, i) => (
          <div key={i} className="self-end text-center text-[11px] tabular-nums text-[#6f8aac]">
            {i + 1}
          </div>
        ))}
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <div className="flex items-center truncate pr-2 text-[14px]">{row.label}</div>
            {row.values.map((v, i) => (
              <div
                key={i}
                className="flex h-[38px] items-center justify-center rounded-[3px] text-[11px] tabular-nums"
                style={heatColor(v, max)}
              >
                {v > 0 ? Math.round(v) : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-[12px] text-[#6f8aac]">
        <span>0</span>
        <span className="flex gap-[2px]">
          {HEAT_RAMP.map((c) => (
            <span key={c} className="h-2.5 w-5 rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
        </span>
        <span className="tabular-nums">{formatNumber(max)} мин</span>
      </div>
    </div>
  );
}

export function HeatmapSlide({
  meta,
  data,
  daysInMonth,
}: {
  meta: SlideMeta;
  data: LineMonthData;
  daysInMonth: number;
}) {
  const blank = () => Array.from({ length: daysInMonth }, () => 0);
  const dayShift = blank();
  const nightShift = blank();
  const perArea = AREAS.flatMap((a) => {
    const d = data.downtime[a.area];
    if (!d) return [];
    const values = blank();
    for (const day of d.days) {
      const i = day.day - 1;
      if (i < 0 || i >= daysInMonth) continue;
      values[i] += day.shifts.day + day.shifts.night;
      dayShift[i] += day.shifts.day;
      nightShift[i] += day.shifts.night;
    }
    return [{ label: a.label, values }];
  });

  if (!perArea.length) {
    return (
      <SlideFrame meta={meta} title="Простои по дням месяца">
        <Empty>Нет данных о простоях.</Empty>
      </SlideFrame>
    );
  }

  return (
    <SlideFrame
      meta={meta}
      title="Простои по дням месяца"
      aside={<span className="text-[14px] text-[#6f8aac]">минуты простоя; чем темнее, тем больше</span>}
    >
      <div className="flex h-full flex-col justify-center gap-7">
        <HeatRows
          title="Все участки"
          days={daysInMonth}
          rows={[
            { label: "Дневная смена", values: dayShift },
            { label: "Ночная смена", values: nightShift },
          ]}
        />
        <HeatRows title="По участкам, сутки" days={daysInMonth} rows={perArea} />
      </div>
    </SlideFrame>
  );
}

// ---------- 8. Технические параметры ----------

export function ParametersSlide({ meta, data }: { meta: SlideMeta; data: LineMonthData }) {
  const p = data.parameters;
  const tiles = [
    { label: "Цикл пресса", value: p?.pressCycleMin, decimals: 1, unit: "мин", note: "среднее по сменам" },
    { label: "Цикл обжига", value: p?.kilnCycleMin, decimals: 0, unit: "мин", note: "среднее по сменам" },
    { label: "Температура обжига", value: p?.kilnTemperatureC, decimals: 0, unit: "°C", note: "среднее по сменам" },
    {
      label: "Эффективность пресса",
      value: data.kpi?.pressEfficiency !== undefined ? data.kpi.pressEfficiency * 100 : undefined,
      decimals: 1,
      unit: "%",
      note: "итого за месяц",
    },
  ];

  return (
    <SlideFrame meta={meta} title="Технические параметры">
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-5 pb-1">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col justify-between rounded-xl border border-[#dcdde3] bg-[#f8fafc] px-8 py-7">
            <div className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[#6f8aac]">{t.label}</div>
            <div className="text-[64px] font-semibold tabular-nums leading-none">
              {t.value === undefined ? "—" : formatNumber(t.value, { decimals: t.decimals })}
              {t.value !== undefined && <span className="ml-2 text-[28px] font-medium text-[#6f8aac]">{t.unit}</span>}
            </div>
            <div className="text-[15px] text-[#6f8aac]">{t.note}</div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

export const PRESENTATION_AREAS = AREAS;

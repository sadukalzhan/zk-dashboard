import { Header } from "@/components/Header";
import { KpiCards } from "@/components/blocks/KpiCards";
import { YearlyTrend } from "@/components/blocks/YearlyTrend";
import { DowntimeByArea } from "@/components/blocks/DowntimeByArea";
import { Heatmap } from "@/components/blocks/Heatmap";
import { Losses } from "@/components/blocks/Losses";
import { Parameters } from "@/components/blocks/Parameters";
import { DailyTable } from "@/components/blocks/DailyTable";
import { LINE_LABELS } from "@/lib/line-mapping";
import { getLineMonthData } from "@/lib/sheets/aggregator";
import { availableMonths } from "@/lib/store/sources";
import type { LineNumber } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  line?: string;
  year?: string;
  month?: string;
  compare?: string;
}>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const months = await availableMonths();
  const fallback = months[0] ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const year = Number(sp.year ?? fallback.year);
  const month = Number(sp.month ?? fallback.month);
  const lineParam = Number(sp.line ?? 1);
  const line: LineNumber = lineParam === 2 ? 2 : 1;
  const compare = sp.compare === "1";

  const primary = await getLineMonthData(line, year, month);
  const other: LineNumber = line === 1 ? 2 : 1;
  const secondary = compare ? await getLineMonthData(other, year, month) : null;

  const noData = months.length === 0;

  return (
    <>
      <Header line={line} year={year} month={month} compare={compare} availableMonths={months} />
      <main className="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 sm:px-6">
        {noData && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-base font-semibold text-amber-900">Источники данных не настроены</h2>
            <p className="mt-2 text-sm text-amber-900/80">
              Чтобы увидеть данные, добавьте ссылки на Google Sheets для каждой линии и месяца в{" "}
              <Link href="/settings" className="font-semibold underline">панели настроек</Link>.
            </p>
          </div>
        )}

        {primary.errors.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {primary.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            {compare
              ? `Сравнение линий — ${monthLabel(month)} ${year}`
              : `${LINE_LABELS[line].long} — ${monthLabel(month)} ${year}`}
          </h1>
          {primary.source && (
            <a
              href={primary.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Исходный Google Sheets ↗
            </a>
          )}
        </div>

        {compare && secondary ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                <div className="text-sm font-semibold text-blue-900">{LINE_LABELS[1].long}</div>
                <KpiCards data={line === 1 ? primary : secondary} />
              </div>
              <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/30 p-4">
                <div className="text-sm font-semibold text-sky-900">{LINE_LABELS[2].long}</div>
                <KpiCards data={line === 2 ? primary : secondary} />
              </div>
            </div>
            <YearlyTrend
              primary={line === 1 ? primary : secondary}
              secondary={line === 1 ? secondary : primary}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <DowntimeByArea data={line === 1 ? primary : secondary} />
              <DowntimeByArea data={line === 2 ? primary : secondary} />
            </div>
            <Losses data={line === 1 ? primary : secondary} compareWith={line === 1 ? secondary : primary} />
            <Parameters data={line === 1 ? primary : secondary} compareWith={line === 1 ? secondary : primary} />
          </>
        ) : (
          <>
            <KpiCards data={primary} />
            <YearlyTrend primary={primary} />
            <DowntimeByArea data={primary} />
            <Heatmap data={primary} />
            <Losses data={primary} />
            <Parameters data={primary} />
            <DailyTable data={primary} />
          </>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        ТОО Зерде-Керамика Актобе · ЗК-Дашборд · {new Date().getFullYear()}
      </footer>
    </>
  );
}

function monthLabel(m: number): string {
  const names = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];
  return names[m - 1] ?? `${m}`;
}

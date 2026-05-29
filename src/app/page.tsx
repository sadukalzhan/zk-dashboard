import { Header } from "@/components/Header";
import { KpiCards } from "@/components/blocks/KpiCards";
import { YearlyTrend } from "@/components/blocks/YearlyTrend";
import { DowntimeByArea } from "@/components/blocks/DowntimeByArea";
import { Heatmap } from "@/components/blocks/Heatmap";
import { Parameters } from "@/components/blocks/Parameters";
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
      <main className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6">
        {noData && (
          <div className="rounded-lg border border-[#f4c7a8] bg-[#fff4ed] p-6 shadow-[0_18px_45px_rgba(25,37,55,0.06)]">
            <h2 className="text-base font-semibold text-amber-900">Источники данных не настроены</h2>
            <p className="mt-2 text-sm text-amber-900/80">
              Чтобы увидеть данные, добавьте ссылки на Google Sheets для каждой линии и месяца в{" "}
              <Link href="/settings" className="font-semibold underline">панели настроек</Link>.
            </p>
          </div>
        )}

        {primary.errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
            {primary.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#192537]">
            {compare
              ? `Сравнение линий — ${monthLabel(month)} ${year}`
              : `${LINE_LABELS[line].long} — ${monthLabel(month)} ${year}`}
          </h1>
          {primary.source && (
            <a
              href={primary.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#4b6b95] hover:text-[#ee5c25] hover:underline"
            >
              Исходный Google Sheets ↗
            </a>
          )}
        </div>

        {compare && secondary ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-lg border border-[#dcdde3] bg-white p-4 shadow-[0_18px_45px_rgba(25,37,55,0.06)]">
                <div className="text-sm font-semibold text-[#192537]">{LINE_LABELS[1].long}</div>
                <KpiCards data={line === 1 ? primary : secondary} />
              </div>
              <div className="space-y-4 rounded-lg border border-[#dcdde3] bg-white p-4 shadow-[0_18px_45px_rgba(25,37,55,0.06)]">
                <div className="text-sm font-semibold text-[#192537]">{LINE_LABELS[2].long}</div>
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
            <Parameters data={line === 1 ? primary : secondary} compareWith={line === 1 ? secondary : primary} />
          </>
        ) : (
          <>
            <KpiCards data={primary} />
            <YearlyTrend primary={primary} />
            <DowntimeByArea data={primary} />
            <Heatmap data={primary} />
            <Parameters data={primary} />
          </>
        )}
      </main>
      <footer className="border-t border-[#dcdde3] bg-[#eef2f6] py-4 text-center text-xs text-[#6f8aac]">
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

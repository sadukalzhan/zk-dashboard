import { Header } from "@/components/Header";
import { KpiCards } from "@/components/blocks/KpiCards";
import { YearlyTrend } from "@/components/blocks/YearlyTrend";
import { DowntimeByArea } from "@/components/blocks/DowntimeByArea";
import { Heatmap } from "@/components/blocks/Heatmap";
import { Parameters } from "@/components/blocks/Parameters";
import { LINE_LABELS, LINE_NUMBERS } from "@/lib/line-mapping";
import { getLineMonthData } from "@/lib/sheets/aggregator";
import { availableMonths } from "@/lib/store/sources";
import { getSections } from "@/lib/store/sections";
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
  const [months, sections] = await Promise.all([availableMonths(), getSections()]);
  const fallback = months[0] ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const year = Number(sp.year ?? fallback.year);
  const month = Number(sp.month ?? fallback.month);
  const line = parseLine(sp.line);
  const compare = sp.compare === "1";

  // В сравнении грузим все линии, иначе только выбранную.
  const ids: LineNumber[] = compare ? LINE_NUMBERS : [line];
  const series = await Promise.all(
    ids.map(async (id) => ({
      id,
      label: LINE_LABELS[id].short,
      data: await getLineMonthData(id, year, month),
    })),
  );

  const primary = series[0].data;
  const errors = [...new Set(series.flatMap((s) => s.data.errors))];
  const noData = months.length === 0;

  return (
    <>
      <Header line={line} year={year} month={month} compare={compare} availableMonths={months} sections={sections} />
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

        {errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
            {errors.map((e, i) => (
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
          {!compare && primary.source && (
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

        {compare ? (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              {series.map((s) => (
                <div
                  key={s.id}
                  className="min-w-0 space-y-4 rounded-lg border border-[#dcdde3] bg-white p-4 shadow-[0_18px_45px_rgba(25,37,55,0.06)]"
                >
                  <div className="text-sm font-semibold text-[#192537]">{LINE_LABELS[s.id].long}</div>
                  <KpiCards data={s.data} />
                </div>
              ))}
            </div>
            <YearlyTrend series={series} />
            <div className="grid gap-4 xl:grid-cols-3">
              {series.map((s) => (
                <div key={s.id} className="min-w-0">
                  <DowntimeByArea data={s.data} />
                </div>
              ))}
            </div>
            <Parameters series={series} />
          </>
        ) : (
          <>
            <KpiCards data={primary} />
            <YearlyTrend series={series} />
            <DowntimeByArea data={primary} />
            <Heatmap data={primary} />
            <Parameters series={series} />
          </>
        )}
      </main>
      <footer className="border-t border-[#dcdde3] bg-[#eef2f6] py-4 text-center text-xs text-[#6f8aac]">
        ТОО Зерде-Керамика Актобе · ЗК-Дашборд · {new Date().getFullYear()}
      </footer>
    </>
  );
}

function parseLine(raw: string | undefined): LineNumber {
  const value = Number(raw ?? 1);
  return LINE_NUMBERS.includes(value as LineNumber) ? (value as LineNumber) : 1;
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

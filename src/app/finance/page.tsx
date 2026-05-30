import Link from "next/link";
import { FinanceHeader } from "@/components/finance/FinanceHeader";
import { FinanceKpi } from "@/components/finance/FinanceKpi";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { PLTable } from "@/components/finance/PLTable";
import { CashFlowTable } from "@/components/finance/CashFlowTable";
import { getFinanceData } from "@/lib/finance/aggregator";
import { availableFinanceYears } from "@/lib/store/sources";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ year?: string; monthIndex?: string }>;

export default async function FinancePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const years = await availableFinanceYears();
  const fallbackYear = years[0] ?? new Date().getFullYear();
  const year = Number(sp.year ?? fallbackYear);
  const monthIndex = sp.monthIndex !== undefined ? Math.max(0, Math.min(11, Number(sp.monthIndex))) : undefined;

  const data = await getFinanceData(year);
  const hasNoSource = !data.source;

  // Pick last non-zero month as default if not given
  const effectiveMonth =
    monthIndex !== undefined
      ? monthIndex
      : Math.max(0, lastNonZeroIndex(data.pl?.revenue?.values));

  return (
    <>
      <FinanceHeader year={year} monthIndex={effectiveMonth} availableYears={years} />
      <main className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6">
        {hasNoSource && (
          <div className="rounded-lg border border-[#f4c7a8] bg-[#fff4ed] p-6 shadow-[0_18px_45px_rgba(25,37,55,0.06)]">
            <h2 className="text-base font-semibold text-amber-900">Источник финансовых данных не настроен</h2>
            <p className="mt-2 text-sm text-amber-900/80">
              Добавьте ссылку на Google Sheets с ОПиУ и ДДС за <b>{year}</b> год в{" "}
              <Link href="/settings" className="font-semibold underline">панели настроек</Link>.
            </p>
          </div>
        )}

        {data.errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
            {data.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#192537]">
            Финансовые показатели · {year} г.
          </h1>
          {data.source && (
            <a
              href={data.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#4b6b95] hover:text-[#ee5c25] hover:underline"
            >
              Исходный Google Sheets ↗
            </a>
          )}
        </div>

        <FinanceKpi data={data} monthIndex={effectiveMonth} />
        <MonthlyChart data={data} />
        <PLTable data={data} />
        <CashFlowTable data={data} />
      </main>
      <footer className="border-t border-[#dcdde3] bg-[#eef2f6] py-4 text-center text-xs text-[#6f8aac]">
        © {new Date().getFullYear()} ТОО «Зерде-Керамика Актобе»
      </footer>
    </>
  );
}

function lastNonZeroIndex(arr?: number[]): number {
  if (!arr) return 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i]) return i;
  }
  return 0;
}

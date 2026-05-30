import { MovementBalanceTable } from "@/components/finished-products/MovementBalanceTable";
import { SalesDashboard } from "@/components/finished-products/SalesDashboard";
import { FinishedProductsHeader } from "@/components/finished-products/FinishedProductsHeader";
import { getFinishedProductsData, type MovementTableFilters } from "@/lib/finished-products/aggregator";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FinishedProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const data = await getFinishedProductsData();
  const filters = parseFilters(sp);

  return (
    <>
      <FinishedProductsHeader />
      <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#192537]">Готовые продукции</h1>
            <p className="mt-1 text-sm text-[#6f8aac]">Продажи, производство, остатки и перепроизводство по дизайнам.</p>
          </div>
          <div className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-xs text-[#6f8aac] shadow-sm">
            Structured Data: {data.structured.length.toLocaleString("ru-RU")} · Движение: {data.movement.length.toLocaleString("ru-RU")}
          </div>
        </div>

        {data.errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
            {data.errors.map((error, index) => <div key={index}>{error}</div>)}
          </div>
        )}

        <SalesDashboard data={data.dashboard} />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#dcdde3]" />
          <h2 className="text-sm font-semibold uppercase text-[#6f8aac]">Таблица остатков</h2>
          <div className="h-px flex-1 bg-[#dcdde3]" />
        </div>

        <MovementBalanceTable rows={data.movement} filters={filters} />
      </main>
      <footer className="border-t border-[#dcdde3] bg-[#eef2f6] py-4 text-center text-xs text-[#6f8aac]">
        © {new Date().getFullYear()} ТОО «Зерде-Керамика Актобе»
      </footer>
    </>
  );
}

function parseFilters(sp: Record<string, string | string[] | undefined>): MovementTableFilters {
  const value = (key: string) => {
    const raw = sp[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const format = value("format");
  const minSale = positiveNumber(value("minSale"));
  const saleAfterMonths = positiveNumber(value("saleAfterMonths"));
  return {
    brand: value("brand") || "all",
    design: value("design") || "all",
    format: format === "60" || format === "120" ? format : "all",
    minSale,
    saleAfterMonths,
    page: Math.max(1, Number(value("page") ?? 1) || 1),
  };
}

function positiveNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

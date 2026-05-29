import { InventoryTable } from "@/components/finished-products/InventoryTable";
import { SalesDashboard } from "@/components/finished-products/SalesDashboard";
import { FinishedProductsHeader } from "@/components/finished-products/FinishedProductsHeader";
import { getFinishedProductsData, type InventoryFilters } from "@/lib/finished-products/aggregator";
import type { InventoryItem, InventoryStatus } from "@/lib/types";

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

        <InventoryTable items={data.inventory} filters={filters} />
      </main>
      <footer className="border-t border-[#dcdde3] bg-[#eef2f6] py-4 text-center text-xs text-[#6f8aac]">
        © {new Date().getFullYear()} ТОО «Зерде-Керамика Актобе»
      </footer>
    </>
  );
}

function parseFilters(sp: Record<string, string | string[] | undefined>): InventoryFilters {
  const value = (key: string) => {
    const raw = sp[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const sort = value("sort");
  const status = value("status");
  const format = value("format");
  return {
    brand: value("brand") || "all",
    format: format === "60" || format === "120" ? format : "all",
    status: isStatus(status) ? status : "all",
    search: value("search") ?? "",
    onlyOverproduction: value("onlyOverproduction") === "1",
    sort: isSort(sort) ? sort : "currentBalance",
    dir: value("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(value("page") ?? 1) || 1),
  };
}

function isStatus(value: unknown): value is InventoryStatus | "all" {
  return value === "all" || value === "critical" || value === "excess" || value === "stale" || value === "ok";
}

function isSort(value: unknown): value is keyof InventoryItem {
  return (
    value === "brand" ||
    value === "design" ||
    value === "format" ||
    value === "currentBalance" ||
    value === "lastSale" ||
    value === "overproductionCount" ||
    value === "excessProduction" ||
    value === "status"
  );
}

import Link from "next/link";
import { Card } from "@/components/Card";
import { buildInventoryView, type InventoryFilters, type InventoryView } from "@/lib/finished-products/aggregator";
import type { InventoryItem, InventoryStatus } from "@/lib/types";
import { KpiCard } from "./KpiCard";

type Props = {
  items: InventoryItem[];
  filters: InventoryFilters;
};

const STATUS_OPTIONS: Array<{ value: "all" | InventoryStatus; label: string }> = [
  { value: "all", label: "Все" },
  { value: "critical", label: "Критично" },
  { value: "excess", label: "Перепроизводство" },
  { value: "stale", label: "Застой" },
  { value: "ok", label: "Норма" },
];

export function InventoryTable({ items, filters }: Props) {
  const view = buildInventoryView(items, filters);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Позиций с остатком > 0" value={view.kpis.positiveBalancePositions.toLocaleString("ru-RU")} />
        <KpiCard label="Общий остаток" value={formatThousandM2(view.kpis.totalBalance)} accent="orange" />
        <KpiCard label="Позиций с перепроизводством" value={view.kpis.overproductionPositions.toLocaleString("ru-RU")} accent="red" />
        <KpiCard label="Лишний объём производства" value={formatThousandM2(view.kpis.excessProduction)} accent="red" />
      </div>

      <Card title="Таблица остатков и перепроизводства">
        <Filters view={view} filters={filters} />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[#dcdde3] text-sm">
            <thead className="bg-[#f4f7fb] text-xs uppercase text-[#6f8aac]">
              <tr>
                <SortHeader label="Бренд" sort="brand" filters={filters} />
                <SortHeader label="Дизайн" sort="design" filters={filters} />
                <SortHeader label="Формат" sort="format" filters={filters} />
                <SortHeader label="Текущий остаток" sort="currentBalance" filters={filters} align="right" />
                <SortHeader label="Продажи (посл. мес.)" sort="lastSale" filters={filters} align="right" />
                <SortHeader label="Перепроизв. (раз)" sort="overproductionCount" filters={filters} align="right" />
                <SortHeader label="Лишнее пр-во" sort="excessProduction" filters={filters} align="right" />
                <SortHeader label="Статус" sort="status" filters={filters} />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7ebf0]">
              {view.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-[#6f8aac]">
                    Нет данных по выбранным фильтрам.
                  </td>
                </tr>
              ) : (
                view.pageItems.map((item) => (
                  <tr key={`${item.brand}-${item.design}-${item.format}`} className="text-[#192537] hover:bg-[#f4f7fb]">
                    <td className="px-3 py-2 font-medium">{item.brand}</td>
                    <td className="min-w-56 px-3 py-2">{item.design}</td>
                    <td className="px-3 py-2">{item.format === 60 ? "60x60" : "120x60"}</td>
                    <td className="min-w-44 px-3 py-2 text-right tabular-nums">
                      <MetricBar value={item.currentBalance} max={max(view.filteredItems, "currentBalance")} tone="navy" />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatM2(item.lastSale)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${item.overproductionCount > 0 ? "font-bold text-[#ee5c25]" : ""}`}>
                      {item.overproductionCount}
                    </td>
                    <td className="min-w-44 px-3 py-2 text-right tabular-nums">
                      <MetricBar value={item.excessProduction} max={max(view.filteredItems, "excessProduction")} tone="red" />
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination view={view} filters={filters} />
      </Card>
    </section>
  );
}

function Filters({ view, filters }: { view: InventoryView; filters: InventoryFilters }) {
  return (
    <form className="grid grid-cols-1 gap-3 rounded-lg border border-[#dcdde3] bg-[#f4f7fb] p-3 md:grid-cols-6" action="/finished-products">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Бренд</span>
        <select name="brand" defaultValue={filters.brand ?? "all"} className={inputClass}>
          <option value="all">Все</option>
          {view.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Формат</span>
        <select name="format" defaultValue={filters.format ?? "all"} className={inputClass}>
          <option value="all">Все</option>
          <option value="60">60x60</option>
          <option value="120">120x60</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Статус</span>
        <select name="status" defaultValue={filters.status ?? "all"} className={inputClass}>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Поиск по дизайну</span>
        <input name="search" defaultValue={filters.search ?? ""} className={inputClass} placeholder="Название дизайна" />
      </label>
      <div className="flex items-end gap-3">
        <label className="flex min-h-10 items-center gap-2 text-sm text-[#192537]">
          <input type="checkbox" name="onlyOverproduction" value="1" defaultChecked={!!filters.onlyOverproduction} className="h-4 w-4 accent-[#ee5c25]" />
          Только перепроизводство
        </label>
        <input type="hidden" name="sort" value={filters.sort ?? "currentBalance"} />
        <input type="hidden" name="dir" value={filters.dir ?? "desc"} />
        <button className="rounded-lg bg-[#ee5c25] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(238,92,37,0.22)] hover:bg-[#d84f1d]">
          Применить
        </button>
      </div>
    </form>
  );
}

function SortHeader({
  label,
  sort,
  filters,
  align = "left",
}: {
  label: string;
  sort: keyof InventoryItem;
  filters: InventoryFilters;
  align?: "left" | "right";
}) {
  const active = filters.sort === sort || (!filters.sort && sort === "currentBalance");
  const nextDir = active && filters.dir !== "asc" ? "asc" : "desc";
  return (
    <th className={`px-3 py-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      <Link href={`/finished-products?${query({ ...filters, sort, dir: nextDir, page: 1 })}`} className="inline-flex items-center gap-1 hover:text-[#192537]">
        {label}
        {active && <span>{filters.dir === "asc" ? "↑" : "↓"}</span>}
      </Link>
    </th>
  );
}

function Pagination({ view, filters }: { view: InventoryView; filters: InventoryFilters }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6f8aac]">
      <div>
        Стр. {view.page} из {view.totalPages} | Показано {view.pageItems.length} из {view.totalFiltered}
      </div>
      <div className="flex gap-2">
        <PageLink disabled={view.page <= 1} label="Назад" href={`/finished-products?${query({ ...filters, page: view.page - 1 })}`} />
        <PageLink disabled={view.page >= view.totalPages} label="Далее" href={`/finished-products?${query({ ...filters, page: view.page + 1 })}`} />
      </div>
    </div>
  );
}

function PageLink({ disabled, label, href }: { disabled: boolean; label: string; href: string }) {
  if (disabled) return <span className="rounded-lg border border-[#dcdde3] px-3 py-1.5 opacity-40">{label}</span>;
  return <Link href={href} className="rounded-lg border border-[#dcdde3] bg-white px-3 py-1.5 text-[#192537] shadow-sm hover:bg-[#f4f7fb]">{label}</Link>;
}

function StatusBadge({ status }: { status: InventoryStatus }) {
  const map = {
    critical: ["Критично", "bg-rose-100 text-rose-700"],
    excess: ["Было лишнее", "bg-amber-100 text-amber-800"],
    stale: ["Застой", "bg-yellow-100 text-yellow-800"],
    ok: ["Норма", "bg-emerald-100 text-emerald-700"],
  } satisfies Record<InventoryStatus, [string, string]>;
  const [label, cls] = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function MetricBar({ value, max, tone }: { value: number; max: number; tone: "navy" | "red" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = tone === "red" ? "bg-rose-500" : "bg-[#4b6b95]";
  return (
    <div>
      <div>{formatM2(value)}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e7ebf0]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function query(filters: InventoryFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === "all" || value === false) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function max(items: InventoryItem[], key: "currentBalance" | "excessProduction"): number {
  return Math.max(1, ...items.map((item) => item[key]));
}

function formatThousandM2(value: number): string {
  return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс. кв.м`;
}

function formatM2(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

const inputClass = "w-full rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none";

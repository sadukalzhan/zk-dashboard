import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import {
  buildMovementTableView,
  type MovementTableFilters,
  type MovementTableView,
} from "@/lib/finished-products/aggregator";
import type { MovementRow } from "@/lib/types";

type Props = {
  rows: MovementRow[];
  filters: MovementTableFilters;
};

export function MovementBalanceTable({ rows, filters }: Props) {
  const view = buildMovementTableView(rows, filters);

  return (
    <section id="balance-table" className="space-y-4">
      <Card title="Таблица остатков">
        <Filters view={view} filters={filters} />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[#dcdde3] text-sm">
            <thead className="bg-[#f4f7fb] text-xs uppercase text-[#6f8aac]">
              <tr>
                <Th>Бренд</Th>
                <Th>Дизайн</Th>
                <Th>Сорт</Th>
                <Th>Формат</Th>
                <Th>Месяц</Th>
                <Th align="right">Год</Th>
                <Th align="right">Производство (Made)</Th>
                <Th align="right">Продажа (Sale)</Th>
                <Th align="right">Остаток</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7ebf0]">
              {view.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-[#6f8aac]">
                    Нет данных по выбранным фильтрам.
                  </td>
                </tr>
              ) : (
                view.pageItems.map((item, index) => (
                  <tr
                    key={`${item.brand}-${item.design}-${item.grade}-${item.format}-${item.year}-${item.month}-${index}`}
                    className="text-[#192537] hover:bg-[#f4f7fb]"
                  >
                    <td className="px-3 py-2 font-medium">{item.brand}</td>
                    <td className="min-w-56 px-3 py-2">{item.design}</td>
                    <td className="px-3 py-2">{item.grade}</td>
                    <td className="px-3 py-2">{item.format === 120 ? "120x60" : "60x60"}</td>
                    <td className="px-3 py-2">{item.month}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{item.year}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(item.produced)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(item.sold)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(item.balance)}</td>
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

function Filters({ view, filters }: { view: MovementTableView; filters: MovementTableFilters }) {
  return (
    <form className="grid grid-cols-1 gap-3 rounded-lg border border-[#dcdde3] bg-[#f4f7fb] p-3 md:grid-cols-6" action="/finished-products#balance-table">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Выберите Бренд</span>
        <select name="brand" defaultValue={filters.brand ?? "all"} className={inputClass}>
          <option value="all">-- Все Бренды --</option>
          {view.brands.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Выберите Дизайн</span>
        <select name="design" defaultValue={filters.design ?? "all"} className={inputClass}>
          <option value="all">-- Все Дизайны --</option>
          {view.designs.map((design) => (
            <option key={design} value={design}>{design}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Выберите Формат</span>
        <select name="format" defaultValue={filters.format ?? "all"} className={inputClass}>
          <option value="all">-- Все Форматы --</option>
          {view.formats.map((format) => (
            <option key={format} value={String(format)}>{format === 120 ? "120x60" : "60x60"}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Суммарный объём продаж (&gt;)</span>
        <input
          name="minSale"
          type="number"
          min="0"
          step="any"
          defaultValue={filters.minSale ?? ""}
          className={inputClass}
          placeholder="Например: 10000 (необязательно)"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Продажа через N месяцев или позднее (N)</span>
        <input
          name="saleAfterMonths"
          type="number"
          min="0"
          step="1"
          defaultValue={filters.saleAfterMonths ?? ""}
          className={inputClass}
          placeholder="Например: 6 (включительно, необязательно)"
        />
      </label>
      <div className="flex items-end gap-2">
        <button className="rounded-lg bg-[#ee5c25] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(238,92,37,0.22)] hover:bg-[#d84f1d]">
          Применить
        </button>
        <Link href="/finished-products#balance-table" className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm hover:bg-[#f4f7fb]">
          Сбросить
        </Link>
      </div>
    </form>
  );
}

function Pagination({ view, filters }: { view: MovementTableView; filters: MovementTableFilters }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6f8aac]">
      <div>
        Стр. {view.page} из {view.totalPages} | Показано {view.pageItems.length} из {view.totalFiltered}
      </div>
      <div className="flex gap-2">
        <PageLink disabled={view.page <= 1} label="Назад" href={pageHref({ ...filters, page: view.page - 1 })} />
        <PageLink disabled={view.page >= view.totalPages} label="Далее" href={pageHref({ ...filters, page: view.page + 1 })} />
      </div>
    </div>
  );
}

function PageLink({ disabled, label, href }: { disabled: boolean; label: string; href: string }) {
  if (disabled) return <span className="rounded-lg border border-[#dcdde3] px-3 py-1.5 opacity-40">{label}</span>;
  return <Link href={href} className="rounded-lg border border-[#dcdde3] bg-white px-3 py-1.5 text-[#192537] shadow-sm hover:bg-[#f4f7fb]">{label}</Link>;
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return <th className={`px-3 py-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function pageHref(filters: MovementTableFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === "all") continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return `/finished-products${query ? `?${query}` : ""}#balance-table`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

const inputClass = "w-full rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none";

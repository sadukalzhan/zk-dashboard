"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/Card";
import type { FinishedFormat, MovementRow } from "@/lib/types";

type MovementTableFilters = {
  brand?: string;
  design?: string;
  format?: "all" | "60" | "120";
  minSale?: number;
  saleAfterMonths?: number;
  page?: number;
};

type FormatFilter = NonNullable<MovementTableFilters["format"]>;

type MovementTableRow = MovementRow & {
  totalSales: number;
  saleDelayMonths: number | null;
  displayColor: string;
};

type MovementTableView = {
  items: MovementTableRow[];
  filteredItems: MovementTableRow[];
  pageItems: MovementTableRow[];
  brands: string[];
  designs: string[];
  designsByBrand: Record<string, string[]>;
  formats: FinishedFormat[];
  page: number;
  totalPages: number;
  totalFiltered: number;
};

type Props = {
  rows: MovementRow[];
  filters: MovementTableFilters;
};

export function MovementBalanceTable({ rows, filters }: Props) {
  const [brand, setBrand] = useState(filters.brand ?? "all");
  const [design, setDesign] = useState(filters.design ?? "all");
  const [format, setFormat] = useState<FormatFilter>(filters.format ?? "all");
  const [minSale, setMinSale] = useState(filters.minSale?.toString() ?? "");
  const [saleAfterMonths, setSaleAfterMonths] = useState(filters.saleAfterMonths?.toString() ?? "");
  const [page, setPage] = useState(filters.page ?? 1);

  const activeFilters = useMemo<MovementTableFilters>(
    () => ({
      brand,
      design,
      format: format === "60" || format === "120" ? format : "all",
      minSale: parseOptionalNumber(minSale, 0),
      saleAfterMonths: parseOptionalNumber(saleAfterMonths, 1),
      page,
    }),
    [brand, design, format, minSale, saleAfterMonths, page],
  );

  const view = useMemo(() => buildMovementTableView(rows, activeFilters), [rows, activeFilters]);
  const availableDesigns = brand !== "all" ? view.designsByBrand[brand] ?? [] : view.designs;

  const resetPage = () => setPage(1);

  return (
    <section id="balance-table" className="space-y-4">
      <Card title="Таблица остатков">
        <Filters
          view={view}
          brand={brand}
          design={design}
          format={format}
          minSale={minSale}
          saleAfterMonths={saleAfterMonths}
          availableDesigns={availableDesigns}
          onBrandChange={(value) => {
            setBrand(value);
            setDesign("all");
            resetPage();
          }}
          onDesignChange={(value) => {
            setDesign(value);
            resetPage();
          }}
          onFormatChange={(value) => {
            setFormat(value);
            resetPage();
          }}
          onMinSaleChange={(value) => {
            setMinSale(value);
            resetPage();
          }}
          onSaleAfterMonthsChange={(value) => {
            setSaleAfterMonths(value);
            resetPage();
          }}
          onReset={() => {
            setBrand("all");
            setDesign("all");
            setFormat("all");
            setMinSale("");
            setSaleAfterMonths("");
            setPage(1);
          }}
        />
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
                    className="text-[#192537]"
                    style={{ backgroundColor: item.displayColor }}
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
        <Pagination view={view} onPageChange={setPage} />
      </Card>
    </section>
  );
}

function Filters({
  view,
  brand,
  design,
  format,
  minSale,
  saleAfterMonths,
  availableDesigns,
  onBrandChange,
  onDesignChange,
  onFormatChange,
  onMinSaleChange,
  onSaleAfterMonthsChange,
  onReset,
}: {
  view: MovementTableView;
  brand: string;
  design: string;
  format: string;
  minSale: string;
  saleAfterMonths: string;
  availableDesigns: string[];
  onBrandChange: (value: string) => void;
  onDesignChange: (value: string) => void;
  onFormatChange: (value: FormatFilter) => void;
  onMinSaleChange: (value: string) => void;
  onSaleAfterMonthsChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <form className="grid grid-cols-1 gap-3 rounded-lg border border-[#dcdde3] bg-[#f4f7fb] p-3 md:grid-cols-6" onSubmit={(event) => event.preventDefault()}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Выберите Бренд</span>
        <select value={brand} onChange={(event) => onBrandChange(event.target.value)} className={inputClass}>
          <option value="all">-- Все Бренды --</option>
          {view.brands.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Выберите Дизайн</span>
        <select value={design} onChange={(event) => onDesignChange(event.target.value)} className={inputClass}>
          <option value="all">-- Все Дизайны --</option>
          {availableDesigns.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Выберите Формат</span>
        <select value={format} onChange={(event) => onFormatChange(parseFormatFilter(event.target.value))} className={inputClass}>
          <option value="all">-- Все Форматы --</option>
          {view.formats.map((item) => (
            <option key={item} value={String(item)}>{item === 120 ? "120x60" : "60x60"}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Суммарный объём продаж (&gt;)</span>
        <input
          type="number"
          min="0"
          step="any"
          value={minSale}
          onChange={(event) => onMinSaleChange(event.target.value)}
          className={inputClass}
          placeholder="Например: 10000 (необязательно)"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-[#6f8aac]">Продажа через N месяцев или позднее (N)</span>
        <input
          type="number"
          min="1"
          step="1"
          value={saleAfterMonths}
          onChange={(event) => onSaleAfterMonthsChange(event.target.value)}
          className={inputClass}
          placeholder="Например: 6 (включительно, необязательно)"
        />
      </label>
      <div className="flex items-end gap-2">
        <button type="button" onClick={onReset} className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm hover:bg-[#f4f7fb]">
          Сбросить
        </button>
      </div>
    </form>
  );
}

function Pagination({ view, onPageChange }: { view: MovementTableView; onPageChange: (page: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6f8aac]">
      <div>
        Стр. {view.page} из {view.totalPages} | Показано {view.pageItems.length} из {view.totalFiltered}
      </div>
      <div className="flex gap-2">
        <PageButton disabled={view.page <= 1} label="Назад" onClick={() => onPageChange(view.page - 1)} />
        <PageButton disabled={view.page >= view.totalPages} label="Далее" onClick={() => onPageChange(view.page + 1)} />
      </div>
    </div>
  );
}

function PageButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
  if (disabled) return <span className="rounded-lg border border-[#dcdde3] px-3 py-1.5 opacity-40">{label}</span>;
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-[#dcdde3] bg-white px-3 py-1.5 text-[#192537] shadow-sm hover:bg-[#f4f7fb]">
      {label}
    </button>
  );
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return <th className={`px-3 py-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function parseOptionalNumber(value: string, min: number): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : undefined;
}

function parseFormatFilter(value: string): FormatFilter {
  return value === "60" || value === "120" ? value : "all";
}

function buildMovementTableView(rows: MovementRow[], filters: MovementTableFilters): MovementTableView {
  const items = withSaleDelay(rows);
  const brands = unique(items.map((item) => item.brand));
  const designs = unique(items.map((item) => item.design));
  const designsByBrand = Object.fromEntries(
    brands.map((item) => [item, unique(items.filter((row) => row.brand === item).map((row) => row.design))]),
  );
  const formats: FinishedFormat[] = [60, 120];

  const filteredItems = items.filter((item) => {
    if (filters.brand && filters.brand !== "all" && item.brand !== filters.brand) return false;
    if (filters.design && filters.design !== "all" && item.design !== filters.design) return false;
    if (filters.format && filters.format !== "all" && String(item.format) !== filters.format) return false;
    if (filters.minSale !== undefined && item.totalSales <= filters.minSale) return false;
    if (filters.saleAfterMonths !== undefined) {
      if (item.saleDelayMonths === null || item.saleDelayMonths < filters.saleAfterMonths) return false;
    }
    return true;
  });

  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / 50));
  const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const pageItems = filteredItems.slice((page - 1) * 50, page * 50);

  return {
    items,
    filteredItems,
    pageItems,
    brands,
    designs,
    designsByBrand,
    formats,
    page,
    totalPages,
    totalFiltered,
  };
}

function withSaleDelay(rows: MovementRow[]): MovementTableRow[] {
  const stats = new Map<string, { firstProduction?: number; totalSales: number; maxSaleDelay: number | null }>();
  const sorted = [...rows].sort(compareMovement);

  for (const row of sorted) {
    const key = movementTableKey(row);
    const item = stats.get(key) ?? { totalSales: 0, maxSaleDelay: null };
    if (row.produced > 0 && item.firstProduction === undefined) item.firstProduction = monthIndex(row);
    if (row.sold > 0) {
      item.totalSales += row.sold;
      if (item.firstProduction !== undefined) {
        const delay = monthIndex(row) - item.firstProduction;
        item.maxSaleDelay = item.maxSaleDelay === null ? delay : Math.max(item.maxSaleDelay, delay);
      }
    }
    stats.set(key, item);
  }

  return rows.map((row) => {
    const item = stats.get(movementTableKey(row));
    return {
      ...row,
      totalSales: item?.totalSales ?? 0,
      saleDelayMonths: item?.maxSaleDelay ?? null,
      displayColor: row.rowColor || fallbackRowColor(row),
    };
  });
}

function compareMovement(a: MovementRow, b: MovementRow): number {
  return (
    a.brand.localeCompare(b.brand, "ru") ||
    a.design.localeCompare(b.design, "ru") ||
    a.grade.localeCompare(b.grade, "ru") ||
    a.format - b.format ||
    a.year - b.year ||
    a.monthNumber - b.monthNumber
  );
}

function movementTableKey(row: MovementRow): string {
  return [row.brand, row.design, row.format].join("\u0001");
}

function monthIndex(row: Pick<MovementRow, "year" | "monthNumber">): number {
  return row.year * 12 + row.monthNumber;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function fallbackRowColor(row: MovementRow): string {
  const palette = ["#cfe2f3", "#ead1dc", "#d9ead3", "#fff2cc", "#b6d7a8", "#f4cccc"];
  let hash = 0;
  for (const char of `${row.brand}|${row.design}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

const inputClass = "w-full rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none";

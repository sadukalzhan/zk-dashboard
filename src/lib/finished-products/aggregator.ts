import { getMovementData, getStructuredData, invalidateFinishedProductsSheetsCache } from "../googleSheets";
import type {
  FinishedProductsDashboard,
  FinishedProductsData,
  FinishedFormat,
  InventoryItem,
  InventoryStatus,
  MovementRow,
  SaleRow,
} from "../types";

export const MONTH_NAMES = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

type CacheEntry = { data: FinishedProductsData; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export type InventoryFilters = {
  brand?: string;
  format?: "all" | "60" | "120";
  status?: "all" | InventoryStatus;
  search?: string;
  onlyOverproduction?: boolean;
  sort?: keyof InventoryItem;
  dir?: "asc" | "desc";
  page?: number;
};

export type InventoryView = {
  items: InventoryItem[];
  filteredItems: InventoryItem[];
  pageItems: InventoryItem[];
  brands: string[];
  kpis: {
    positiveBalancePositions: number;
    totalBalance: number;
    overproductionPositions: number;
    excessProduction: number;
  };
  page: number;
  totalPages: number;
  totalFiltered: number;
};

export type MovementTableFilters = {
  brand?: string;
  design?: string;
  format?: "all" | "60" | "120";
  minSale?: number;
  saleAfterMonths?: number;
  page?: number;
};

export type MovementTableRow = MovementRow & {
  totalSales: number;
  saleDelayMonths: number | null;
  displayColor: string;
};

export type MovementTableView = {
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

export function invalidateFinishedProductsCache(): void {
  cache.clear();
  invalidateFinishedProductsSheetsCache();
}

export async function getFinishedProductsData(options: { force?: boolean } = {}): Promise<FinishedProductsData> {
  const key = "finished-products";
  if (!options.force) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  const errors: string[] = [];
  let structured: SaleRow[] = [];
  let movement: MovementRow[] = [];

  try {
    [structured, movement] = await Promise.all([getStructuredData(), getMovementData()]);
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const data: FinishedProductsData = {
    structured,
    movement,
    dashboard: buildDashboard(structured),
    inventory: buildInventory(movement),
    errors,
  };

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function buildInventoryView(items: InventoryItem[], filters: InventoryFilters): InventoryView {
  const brands = [...new Set(items.map((item) => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  const search = normalize(filters.search ?? "");

  const filteredItems = items.filter((item) => {
    if (filters.brand && filters.brand !== "all" && item.brand !== filters.brand) return false;
    if (filters.format && filters.format !== "all" && String(item.format) !== filters.format) return false;
    if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.onlyOverproduction && item.overproductionCount <= 0) return false;
    if (search && !normalize(item.design).includes(search)) return false;
    return true;
  });

  const sort = filters.sort ?? "currentBalance";
  const dir = filters.dir ?? "desc";
  filteredItems.sort((a, b) => compareValue(a[sort], b[sort], dir));

  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / 15));
  const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const pageItems = filteredItems.slice((page - 1) * 15, page * 15);

  return {
    items,
    filteredItems,
    pageItems,
    brands,
    kpis: {
      positiveBalancePositions: filteredItems.filter((item) => item.currentBalance > 0).length,
      totalBalance: sum(filteredItems, "currentBalance"),
      overproductionPositions: filteredItems.filter((item) => item.overproductionCount > 0).length,
      excessProduction: sum(filteredItems, "excessProduction"),
    },
    page,
    totalPages,
    totalFiltered,
  };
}

export function buildMovementTableView(rows: MovementRow[], filters: MovementTableFilters): MovementTableView {
  const items = withSaleDelay(rows);
  const brands = unique(items.map((item) => item.brand));
  const designs = unique(items.map((item) => item.design));
  const designsByBrand = Object.fromEntries(
    brands.map((brand) => [brand, unique(items.filter((item) => item.brand === brand).map((item) => item.design))]),
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

function buildDashboard(rows: SaleRow[]): FinishedProductsDashboard {
  const sales = rows.filter((row) => row.type === "sale");
  const made = rows.filter((row) => row.type === "made");

  const salesByBrand = groupSum(sales, (row) => row.brand, "quantity");
  const salesByDesign = groupSum(sales, (row) => row.design, "quantity");
  const totalSales = sum(sales, "quantity");
  const totalMade = sum(made, "quantity");

  // All years present in the data (sales or made), ascending.
  const years = [...new Set(rows.map((row) => row.year).filter((year) => Number.isFinite(year)))].sort((a, b) => a - b);

  // Sum of sales per (year, month) in a single pass.
  const salesByYearMonth = new Map<string, number>();
  for (const row of sales) {
    const key = `${row.year}-${row.monthNumber}`;
    salesByYearMonth.set(key, (salesByYearMonth.get(key) ?? 0) + Number(row.quantity ?? 0));
  }

  const monthlySales = MONTH_NAMES.map((month, index) => {
    const monthNumber = index + 1;
    const entry: { month: string; [year: string]: string | number } = { month };
    for (const year of years) {
      entry[String(year)] = salesByYearMonth.get(`${year}-${monthNumber}`) ?? 0;
    }
    return entry;
  });

  const brandShare = [...salesByBrand.entries()]
    .map(([brand, value]) => ({ brand, sales: value, pct: totalSales ? (value / totalSales) * 100 : 0 }))
    .sort((a, b) => b.sales - a.sales);

  const formats: FinishedFormat[] = [60, 120];
  const formatSplit = formats.map((format) => ({
    format: `${format === 60 ? "60x60" : "120x60"}`,
    sales: sum(sales.filter((row) => row.format === format), "quantity"),
    made: sum(made.filter((row) => row.format === format), "quantity"),
  }));

  const topDesigns = [...salesByDesign.entries()]
    .map(([design, value]) => ({ design, sales: value }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const salesByYear = groupSum(sales, (row) => String(row.year), "quantity");
  const madeByYear = groupSum(made, (row) => String(row.year), "quantity");
  const yearlyDynamics = years.map((year) => ({
    year,
    sales: salesByYear.get(String(year)) ?? 0,
    made: madeByYear.get(String(year)) ?? 0,
  }));

  return {
    kpis: {
      totalSales,
      totalMade,
      leadingBrand: topEntry(salesByBrand),
      topDesign: topEntry(salesByDesign),
    },
    years,
    monthlySales,
    brandShare,
    formatSplit,
    topDesigns,
    yearlyDynamics,
  };
}

function buildInventory(rows: MovementRow[]): InventoryItem[] {
  const sorted = [...rows].sort(compareMovement);
  const grouped = new Map<string, MovementRow[]>();
  for (const row of sorted) {
    const key = gradeKey(row);
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const designMap = new Map<string, InventoryItem>();
  for (const bucket of grouped.values()) {
    let prevBalance = 0;
    let overproductionCount = 0;
    let excessProduction = 0;
    for (const row of bucket) {
      if (row.produced > 0 && prevBalance > 500) {
        overproductionCount += 1;
        excessProduction += row.produced;
      }
      prevBalance = row.balance;
    }

    const last = bucket[bucket.length - 1];
    if (!last) continue;
    const key = designKey(last);
    const current = designMap.get(key);
    if (!current) {
      designMap.set(key, {
        brand: last.brand,
        design: last.design,
        format: last.format,
        currentBalance: last.balance,
        lastSale: last.sold,
        overproductionCount,
        excessProduction,
        status: "ok",
      });
    } else {
      current.currentBalance += last.balance;
      current.lastSale += last.sold;
      current.overproductionCount += overproductionCount;
      current.excessProduction += excessProduction;
    }
  }

  const items = [...designMap.values()];
  for (const item of items) item.status = statusFor(item);
  return items.sort((a, b) => b.currentBalance - a.currentBalance);
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

function monthIndex(row: Pick<MovementRow, "year" | "monthNumber">): number {
  return row.year * 12 + row.monthNumber;
}

function statusFor(item: InventoryItem): InventoryStatus {
  if (item.overproductionCount >= 5 && item.currentBalance > 1000) return "critical";
  if (item.overproductionCount > 0) return "excess";
  if (item.currentBalance > 2000 && item.lastSale === 0) return "stale";
  return "ok";
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

function gradeKey(row: MovementRow): string {
  return [row.brand, row.design, row.grade, row.format].join("\u0001");
}

function designKey(row: MovementRow): string {
  return [row.brand, row.design, row.format].join("\u0001");
}

function movementTableKey(row: MovementRow): string {
  return [row.brand, row.design, row.format].join("\u0001");
}

function groupSum<T>(rows: T[], getKey: (row: T) => string, valueKey: keyof T): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row) || "Без названия";
    map.set(key, (map.get(key) ?? 0) + Number(row[valueKey] ?? 0));
  }
  return map;
}

function topEntry(map: Map<string, number>): string {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

function sum<T>(rows: T[], key: keyof T): number {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function compareValue(a: unknown, b: unknown, dir: "asc" | "desc"): number {
  const multiplier = dir === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * multiplier;
  return String(a ?? "").localeCompare(String(b ?? ""), "ru") * multiplier;
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

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

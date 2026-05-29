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

function buildDashboard(rows: SaleRow[]): FinishedProductsDashboard {
  const sales = rows.filter((row) => row.type === "sale");
  const made = rows.filter((row) => row.type === "made");

  const salesByBrand = groupSum(sales, (row) => row.brand, "quantity");
  const salesByDesign = groupSum(sales, (row) => row.design, "quantity");
  const totalSales = sum(sales, "quantity");
  const totalMade = sum(made, "quantity");

  const monthlySales = MONTH_NAMES.map((month, index) => {
    const monthNumber = index + 1;
    return {
      month,
      "2023": sum(sales.filter((row) => row.year === 2023 && row.monthNumber === monthNumber), "quantity"),
      "2024": sum(sales.filter((row) => row.year === 2024 && row.monthNumber === monthNumber), "quantity"),
      "2025": sum(sales.filter((row) => row.year === 2025 && row.monthNumber === monthNumber), "quantity"),
    };
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

  const yearlyDynamics = [2022, 2023, 2024, 2025].map((year) => ({
    year,
    sales: sum(sales.filter((row) => row.year === year), "quantity"),
    made: sum(made.filter((row) => row.year === year), "quantity"),
  }));

  return {
    kpis: {
      totalSales,
      totalMade,
      leadingBrand: topEntry(salesByBrand),
      topDesign: topEntry(salesByDesign),
    },
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

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

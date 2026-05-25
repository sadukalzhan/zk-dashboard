// Aggregates finance data (P&L + Cash Flow) for a given year.

import type { FinanceData } from "../types";
import { findFinanceSource } from "../store/sources";
import { fetchSheetsByNames } from "../sheets/fetcher";
import { parseProfitLoss, parseCashFlow } from "./parser";

type CacheEntry = { data: FinanceData; expiresAt: number };
const cache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 15 * 60 * 1000);

// Common sheet names to try (allow minor variations).
const PL_NAMES = ["ОПиУ", "ОПиУ ", "P&L", "ПиУ"];
const CF_NAMES = ["ДДС", "Cash Flow", "CF"];

export function invalidateFinanceCache(): void {
  cache.clear();
}

export async function getFinanceData(year: number, options: { force?: boolean } = {}): Promise<FinanceData> {
  if (!options.force) {
    const hit = cache.get(year);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  const source = await findFinanceSource(year);
  const errors: string[] = [];
  if (!source) {
    return { year, pl: null, cashFlow: null, errors: [`Финансовый источник за ${year} год не настроен.`] };
  }

  // Fetch every plausible sheet name; we'll pick by content.
  const candidates = Array.from(new Set([...PL_NAMES, ...CF_NAMES]));
  let fetched: { sheetName: string; grid: unknown[][] }[];
  try {
    fetched = (await fetchSheetsByNames(source.spreadsheetId, candidates)) as { sheetName: string; grid: unknown[][] }[];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Ошибка загрузки финансов: ${msg}`);
    return { year, source, pl: null, cashFlow: null, errors };
  }

  const grids = new Map(fetched.map((f) => [f.sheetName, f.grid]));

  // Pick the first non-empty grid for each.
  const plGrid = PL_NAMES.map((n) => grids.get(n)).find((g) => g && g.length > 5);
  const cfGrid = CF_NAMES.map((n) => grids.get(n)).find((g) => g && g.length > 5);

  let pl = null;
  let cashFlow = null;
  try {
    if (plGrid) pl = parseProfitLoss(plGrid as never);
    else errors.push("Лист ОПиУ не найден или пустой.");
  } catch (e) {
    errors.push(`Ошибка парсинга ОПиУ: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    if (cfGrid) cashFlow = parseCashFlow(cfGrid as never);
    else errors.push("Лист ДДС не найден или пустой.");
  } catch (e) {
    errors.push(`Ошибка парсинга ДДС: ${e instanceof Error ? e.message : String(e)}`);
  }

  const data: FinanceData = { year, source, pl, cashFlow, errors };
  cache.set(year, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

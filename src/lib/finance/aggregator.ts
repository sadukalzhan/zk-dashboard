// Aggregates finance data (P&L + Cash Flow) for a given year.

import type { FinanceData } from "../types";
import { findFinanceSource } from "../store/sources";
import { fetchSheetsByNames, getSheetMetadata } from "../sheets/fetcher";
import { parseProfitLoss, parseCashFlow } from "./parser";

type CacheEntry = { data: FinanceData; expiresAt: number };
const cache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 15 * 60 * 1000);

// Pattern matchers for sheet titles (handles trailing spaces, alt names).
const PL_PATTERNS = [/^\s*опиу\s*$/i, /^\s*пиу\s*$/i, /^\s*p\s*&\s*l\s*$/i, /прибыл/i];
const CF_PATTERNS = [/^\s*ддс\s*$/i, /cash\s*flow/i, /движен.*ден/i];

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

  let plTitle: string | undefined;
  let cfTitle: string | undefined;
  try {
    const meta = await getSheetMetadata(source.spreadsheetId);
    plTitle = meta.find((s) => PL_PATTERNS.some((re) => re.test(s.title)))?.title;
    cfTitle = meta.find((s) => CF_PATTERNS.some((re) => re.test(s.title)))?.title;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Ошибка чтения структуры таблицы: ${msg}`);
    return { year, source, pl: null, cashFlow: null, errors };
  }

  if (!plTitle) errors.push("Лист ОПиУ (Отчёт о прибылях и убытках) не найден.");
  if (!cfTitle) errors.push("Лист ДДС (Движение денежных средств) не найден.");

  const namesToFetch = [plTitle, cfTitle].filter((t): t is string => Boolean(t));
  if (!namesToFetch.length) {
    return { year, source, pl: null, cashFlow: null, errors };
  }

  let fetched: { sheetName: string; grid: unknown[][] }[];
  try {
    fetched = (await fetchSheetsByNames(source.spreadsheetId, namesToFetch)) as {
      sheetName: string;
      grid: unknown[][];
    }[];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Ошибка загрузки финансов: ${msg}`);
    return { year, source, pl: null, cashFlow: null, errors };
  }

  const grids = new Map(fetched.map((f) => [f.sheetName, f.grid]));
  const plGrid = plTitle ? grids.get(plTitle) : undefined;
  const cfGrid = cfTitle ? grids.get(cfTitle) : undefined;

  let pl = null;
  let cashFlow = null;
  try {
    if (plGrid && plGrid.length > 5) pl = parseProfitLoss(plGrid as never);
    else if (plTitle) errors.push(`Лист "${plTitle}" пустой.`);
  } catch (e) {
    errors.push(`Ошибка парсинга ОПиУ: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    if (cfGrid && cfGrid.length > 5) cashFlow = parseCashFlow(cfGrid as never);
    else if (cfTitle) errors.push(`Лист "${cfTitle}" пустой.`);
  } catch (e) {
    errors.push(`Ошибка парсинга ДДС: ${e instanceof Error ? e.message : String(e)}`);
  }

  const data: FinanceData = { year, source, pl, cashFlow, errors };
  cache.set(year, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

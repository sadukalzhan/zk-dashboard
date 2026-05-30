// Parsers for ОПиУ (P&L) and ДДС (Cash Flow) sheets.
// Both have the same column layout: Статья | Январь..Декабрь | ИТОГО.
// ДДС has a leading empty column (indent), ОПиУ does not.

import type {
  SheetGrid,
  CellValue,
  ProfitLoss,
  CashFlow,
  FinanceSection,
  FinanceStarRow,
  FinanceMargins,
} from "../types";
import { toNumber, toStr } from "../sheet-utils";

// Find the header row index (contains "Январь" or similar) and the column where the month columns start.
function findHeader(grid: SheetGrid): { rowIdx: number; labelCol: number; firstMonthCol: number; totalCol: number } | null {
  const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь"];
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const row = grid[r] ?? [];
    const idx = row.findIndex((c) => months.some((m) => toStr(c).trim().toLowerCase() === m.toLowerCase()));
    if (idx >= 0) {
      // Verify that the next ~5 columns are also month names.
      const matched = months.filter((m, i) => toStr(row[idx + i]).trim().toLowerCase() === m.toLowerCase()).length;
      if (matched >= 4) {
        // Label column = idx - 1 (just before first month).
        const labelCol = Math.max(0, idx - 1);
        // Total column: search for "ИТОГО" after the 12 monthly columns
        let totalCol = idx + 12;
        for (let c = idx + 11; c < row.length; c++) {
          if (toStr(row[c]).trim().toUpperCase() === "ИТОГО") { totalCol = c; break; }
        }
        return { rowIdx: r, labelCol, firstMonthCol: idx, totalCol };
      }
    }
  }
  return null;
}

function isSectionHeader(label: string): boolean {
  // Roman-numeral section headers like "I. ДОХОДЫ", "II. ПРОИЗВОДСТВЕННЫЕ РАСХОДЫ", "1. ОПЕРАЦИОННАЯ ДЕЯТЕЛЬНОСТЬ"
  const s = label.trim();
  return /^(I{1,3}V?|IV|V|VI{0,3}|VII|VIII|IX|X)\.\s/.test(s) || /^\s*\d+\.\s/.test(s);
}

function isStarRow(label: string): boolean {
  return label.trim().startsWith("★");
}

function readMonthly(row: CellValue[], firstMonthCol: number, totalCol: number): { values: number[]; total: number } {
  const values: number[] = [];
  for (let i = 0; i < 12; i++) {
    values.push(toNumber(row[firstMonthCol + i]));
  }
  const total = toNumber(row[totalCol]);
  return { values, total };
}

function rowIsEmpty(row: CellValue[], labelCol: number, firstMonthCol: number, totalCol: number): boolean {
  const label = toStr(row[labelCol]).trim();
  if (label) return false;
  for (let i = firstMonthCol; i <= totalCol; i++) {
    if (toStr(row[i]).trim()) return false;
  }
  return true;
}

function addArrays(a: number[], b: number[]): number[] {
  const out = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}

function sumArr(a: number[]): number { return a.reduce((s, x) => s + x, 0); }

// ---------- P&L ----------

export function parseProfitLoss(grid: SheetGrid): ProfitLoss {
  const header = findHeader(grid);
  if (!header) {
    return { sections: [], stars: [], margins: emptyMargins() };
  }
  const { rowIdx, labelCol, firstMonthCol, totalCol } = header;

  const sections: FinanceSection[] = [];
  const stars: FinanceStarRow[] = [];
  let current: FinanceSection | null = null;

  for (let r = rowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    if (!row.length) { continue; }
    if (rowIsEmpty(row, labelCol, firstMonthCol, totalCol)) { continue; }
    const label = toStr(row[labelCol]).trim();
    if (!label) { continue; }

    if (isStarRow(label)) {
      const { values, total } = readMonthly(row, firstMonthCol, totalCol);
      const star: FinanceStarRow = { label, values, total: total || sumArr(values) };
      stars.push(star);
      // Close current section: this star likely closes it
      if (current) {
        sections.push(current);
        current = null;
      }
      continue;
    }
    if (isSectionHeader(label)) {
      if (current) sections.push(current);
      current = { title: label, rows: [], totals: new Array(12).fill(0), totalYear: 0 };
      continue;
    }
    // Data row
    const { values, total } = readMonthly(row, firstMonthCol, totalCol);
    const effectiveTotal = total || sumArr(values);
    if (current) {
      current.rows.push({ label, values, total: effectiveTotal });
      current.totals = addArrays(current.totals, values);
      current.totalYear += effectiveTotal;
    } else {
      // Orphan row before any section: ignore.
    }
  }
  if (current) sections.push(current);

  // Find well-known stars by label match.
  const findStar = (...patterns: RegExp[]) =>
    stars.find((s) => patterns.some((p) => p.test(s.label.toLowerCase())));

  const revenue = findStar(/итого\s+доходы/, /итого\s+выручк/, /итого\s+реализаци/);
  const cogs = findStar(/итого\s+производственные/, /итого\s+себестоимост/);
  const grossProfit = findStar(/валовая\s+прибыль/);
  const ebitda = findStar(/операционная\s+прибыль|ebitda/);
  const ebit = findStar(/(прибыль\s+до\s+вычета).*ebit\b|^★\s*ebit\b|^★\s*прибыль до вычета процентов/);
  const ebt = findStar(/прибыль\s+до\s+налог|^★\s*ebt\b/);
  const netProfit = findStar(/чистая\s+прибыль/);

  const margins = computeMargins(revenue, grossProfit, ebit, netProfit);

  return {
    sections,
    stars,
    revenue,
    cogs,
    grossProfit,
    ebitda,
    ebit,
    ebt,
    netProfit,
    margins,
  };
}

function emptyMargins(): FinanceMargins {
  return {
    grossMarginPct: new Array(12).fill(0),
    ebitMarginPct: new Array(12).fill(0),
    netMarginPct: new Array(12).fill(0),
    yearGross: 0, yearEbit: 0, yearNet: 0,
  };
}

function computeMargins(
  revenue?: FinanceStarRow,
  gross?: FinanceStarRow,
  ebit?: FinanceStarRow,
  net?: FinanceStarRow,
): FinanceMargins {
  const out = emptyMargins();
  if (!revenue) return out;
  for (let i = 0; i < 12; i++) {
    const rev = revenue.values[i];
    if (!rev) continue;
    if (gross) out.grossMarginPct[i] = gross.values[i] / rev;
    if (ebit) out.ebitMarginPct[i] = ebit.values[i] / rev;
    if (net) out.netMarginPct[i] = net.values[i] / rev;
  }
  const yearRev = revenue.total || sumArr(revenue.values);
  if (yearRev) {
    if (gross) out.yearGross = (gross.total || sumArr(gross.values)) / yearRev;
    if (ebit) out.yearEbit = (ebit.total || sumArr(ebit.values)) / yearRev;
    if (net) out.yearNet = (net.total || sumArr(net.values)) / yearRev;
  }
  return out;
}

// ---------- Cash Flow ----------

const INFLOW_MARKERS = [/поступления\s*\(?\s*приток/i];
const OUTFLOW_MARKERS = [/выплаты\s*\(?\s*отток/i];
const ENDING_BALANCE_MARKERS = [/остаток\s+на\s+конец/i];
const GRAND_INFLOW_TOTAL = /★\s*итого\s+поступлен/i;
const GRAND_OUTFLOW_TOTAL = /★\s*итого\s+выплат/i;
const NET_CASH_FLOW = /чистый\s+денежный\s+поток/i;

// Subtotal labels like "Итого основная деятельность", "  ИТОГО ОПЕРАЦИОННЫЕ ПОСТУПЛЕНИЯ" — exclude from leaf aggregation.
// Note: JS `\b` does not detect word boundaries around Cyrillic without the `u` flag, so we match prefix only.
function isSubtotalRow(label: string): boolean {
  return /^итого($|\s)/i.test(label.trim());
}

// Marker rows like "АНАЛИЗ КАССОВЫХ РАЗРЫВОВ" or other footer/decorative content.
function isFooterMarker(label: string): boolean {
  return /анализ\s+касс|кассов(ый|ого)\s+разрыв|допустимый\s+остат|статус|лимит/i.test(label);
}

export function parseCashFlow(grid: SheetGrid): CashFlow {
  const header = findHeader(grid);
  if (!header) {
    return emptyCashFlow();
  }
  const { rowIdx, labelCol, firstMonthCol, totalCol } = header;

  let beginningBalance = new Array(12).fill(0);
  let endingBalanceFromSheet: number[] | null = null;
  const inflowsBySection: FinanceSection[] = [];
  const outflowsBySection: FinanceSection[] = [];

  type Phase = "balance" | "inflows" | "outflows" | "done";
  let phase: Phase = "balance";
  let current: FinanceSection | null = null;

  const closeCurrent = () => {
    if (current) {
      (phase === "outflows" ? outflowsBySection : inflowsBySection).push(current);
      current = null;
    }
  };

  for (let r = rowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    if (!row.length) continue;
    if (rowIsEmpty(row, labelCol, firstMonthCol, totalCol)) continue;
    const label = toStr(row[labelCol]).trim();
    if (!label) continue;
    const lower = label.toLowerCase();

    if (isFooterMarker(label)) {
      closeCurrent();
      phase = "done";
      continue;
    }

    if (INFLOW_MARKERS.some((re) => re.test(lower))) {
      closeCurrent();
      phase = "inflows";
      continue;
    }
    if (OUTFLOW_MARKERS.some((re) => re.test(lower))) {
      closeCurrent();
      phase = "outflows";
      continue;
    }

    // Grand totals — close section and transition phase.
    if (GRAND_INFLOW_TOTAL.test(label)) {
      closeCurrent();
      // After grand inflow total we expect outflows; but keep phase as-is so next OUTFLOW_MARKER triggers it.
      continue;
    }
    if (GRAND_OUTFLOW_TOTAL.test(label)) {
      closeCurrent();
      continue;
    }
    if (NET_CASH_FLOW.test(lower)) {
      closeCurrent();
      // Capture: nothing extra to do, we compute it.
      continue;
    }

    // Beginning balance row (only in BALANCE phase before any section header)
    if (/итого\s+остаток\s+на\s+начало/i.test(lower) && phase === "balance") {
      const { values } = readMonthly(row, firstMonthCol, totalCol);
      beginningBalance = values;
      continue;
    }

    // Ending balance row (after outflows or in "done" phase)
    if (ENDING_BALANCE_MARKERS.some((re) => re.test(lower))) {
      const { values } = readMonthly(row, firstMonthCol, totalCol);
      if (values.some((v) => v)) endingBalanceFromSheet = values;
      closeCurrent();
      phase = "done";
      continue;
    }

    // Subtotals — skip from leaf aggregation
    if (isSubtotalRow(label)) {
      continue;
    }

    if (isStarRow(label)) {
      closeCurrent();
      continue;
    }

    if (isSectionHeader(label)) {
      closeCurrent();
      current = { title: label.trim(), rows: [], totals: new Array(12).fill(0), totalYear: 0 };
      continue;
    }

    if (phase === "done" || phase === "balance") {
      // Ignore stray rows outside inflows/outflows phases.
      continue;
    }

    const { values, total } = readMonthly(row, firstMonthCol, totalCol);
    const effectiveTotal = total || sumArr(values);
    const allZero = effectiveTotal === 0 && values.every((v) => !v);
    if (allZero) continue; // sub-section header without values

    if (!current) {
      // Default catch-all (shouldn't normally happen if sections are present)
      current = { title: phase === "inflows" ? "Поступления" : "Выплаты", rows: [], totals: new Array(12).fill(0), totalYear: 0 };
    }
    current.rows.push({ label, values, total: effectiveTotal });
    current.totals = addArrays(current.totals, values);
    current.totalYear += effectiveTotal;
  }
  closeCurrent();

  const totalInflows = inflowsBySection.reduce((acc, s) => addArrays(acc, s.totals), new Array(12).fill(0));
  const totalOutflows = outflowsBySection.reduce((acc, s) => addArrays(acc, s.totals), new Array(12).fill(0));
  const netCashFlow = totalInflows.map((v, i) => v - totalOutflows[i]);
  let endingBalance: number[];
  if (endingBalanceFromSheet) {
    endingBalance = endingBalanceFromSheet;
  } else {
    endingBalance = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      const start = i === 0 ? (beginningBalance[0] || 0) : endingBalance[i - 1];
      endingBalance[i] = start + netCashFlow[i];
    }
  }

  return { beginningBalance, inflowsBySection, outflowsBySection, totalInflows, totalOutflows, netCashFlow, endingBalance };
}

function emptyCashFlow(): CashFlow {
  return {
    beginningBalance: new Array(12).fill(0),
    inflowsBySection: [],
    outflowsBySection: [],
    totalInflows: new Array(12).fill(0),
    totalOutflows: new Array(12).fill(0),
    netCashFlow: new Array(12).fill(0),
    endingBalance: new Array(12).fill(0),
  };
}

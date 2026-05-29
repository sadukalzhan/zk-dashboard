// Parses sheet "Выход и простои печи по месяцам"

import type { MonthlyOutput, SheetGrid } from "../../types";
import { findRowContaining, toNumber, toStr } from "../../sheet-utils";
import { MONTH_NAMES_RU } from "../../line-mapping";

export function parseMonthlyOutput(grid: SheetGrid): MonthlyOutput | null {
  if (!grid.length) return null;

  // Find header row containing "МЕСЯЦ"
  const headerRow = findRowContaining(grid, "МЕСЯЦ");
  if (headerRow === -1) return null;

  // Locate column indices (МЕСЯЦ / ВЫХОД ПЕЧИ / ПУСТОТА)
  const hdr = grid[headerRow].map(toStr);
  const monthCol = hdr.findIndex((c) => c.toLowerCase().includes("месяц"));
  const outputCol = hdr.findIndex((c) => c.toLowerCase().includes("выход"));
  const downtimeCol = hdr.findIndex((c) => c.toLowerCase().includes("пустот") || c.toLowerCase().includes("простой"));
  if (monthCol === -1 || outputCol === -1) return null;

  const byMonth: MonthlyOutput["byMonth"] = [];
  let totalOut = 0;
  let totalDown = 0;
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    const name = toStr(row[monthCol]).toUpperCase();
    if (!name) continue;
    if (name === "ИТОГО") {
      totalOut = toNumber(row[outputCol]);
      if (downtimeCol !== -1) totalDown = toNumber(row[downtimeCol]);
      continue;
    }
    const idx = MONTH_NAMES_RU.findIndex((m) => m === name);
    if (idx === -1) continue;
    byMonth.push({
      monthLabel: MONTH_NAMES_RU[idx],
      monthNumber: idx + 1,
      outputM2: toNumber(row[outputCol]),
      downtimeMin: downtimeCol !== -1 ? toNumber(row[downtimeCol]) : 0,
    });
  }

  if (!byMonth.length) return null;

  if (!totalOut) totalOut = byMonth.reduce((s, x) => s + x.outputM2, 0);
  if (!totalDown) totalDown = byMonth.reduce((s, x) => s + x.downtimeMin, 0);

  return { byMonth, totals: { outputM2: totalOut, downtimeMin: totalDown } };
}

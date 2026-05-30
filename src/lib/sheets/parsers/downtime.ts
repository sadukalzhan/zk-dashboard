// Generic parser for downtime sheets: "Простои пресса/ЛГ/печи/ректификации/сортировки".
// All 5 sheets share the same layout:
//   Header row (around R4) with columns: Дата | День | Ночь | Итого | <reason cols...> | мех. | электр. | организ.
// Data rows have dates in column "Дата" (date values).

import type { AreaDowntime, DowntimeArea, DowntimeDay, SheetGrid } from "../../types";
import {
  cell,
  findRowByAll,
  findColInRow,
  parseDateCell,
  toNumber,
  toStr,
} from "../../sheet-utils";

export function parseDowntime(area: DowntimeArea, grid: SheetGrid): AreaDowntime | null {
  if (!grid.length) return null;

  // Find header row containing all four core columns.
  const headerRow = findRowByAll(grid, ["дата", "день", "ночь", "итого"]);
  if (headerRow === -1) return null;

  const dateCol = findColInRow(grid, headerRow, "дата");
  const dayCol = findColInRow(grid, headerRow, "день");
  const nightCol = findColInRow(grid, headerRow, "ночь");
  const totalCol = findColInRow(grid, headerRow, "итого");
  const mechCol = findColInRow(grid, headerRow, "мех.");
  const elecCol = findColInRow(grid, headerRow, "электр.");
  const orgCol = findColInRow(grid, headerRow, "организ.");
  if (dateCol === -1 || dayCol === -1 || nightCol === -1 || totalCol === -1) return null;

  // Reason columns: between (totalCol+1) and mechCol-1; skip empty headers.
  const reasonEnd = mechCol !== -1 ? mechCol : (grid[headerRow].length);
  const reasonCols: Array<{ col: number; label: string }> = [];
  for (let c = totalCol + 1; c < reasonEnd; c++) {
    const label = toStr(grid[headerRow][c]);
    if (label) reasonCols.push({ col: c, label });
  }

  const days: DowntimeDay[] = [];
  const totals = { mechanical: 0, electrical: 0, organizational: 0, total: 0 };
  const reasonTotals: Record<string, number> = {};

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row || !row.length) continue;
    const dateVal = cell(grid, r, dateCol);
    const dateStr = toStr(dateVal).toLowerCase();
    if (!dateVal) continue;
    if (dateStr.startsWith("итого")) {
      // Stop at totals row; capture sums below
      break;
    }
    const date = parseDateCell(dateVal);
    if (!date) continue;
    const dayNum = date.getDate();
    const dayMin = toNumber(row[dayCol]);
    const nightMin = toNumber(row[nightCol]);
    const mech = mechCol !== -1 ? toNumber(row[mechCol]) : 0;
    const elec = elecCol !== -1 ? toNumber(row[elecCol]) : 0;
    const org = orgCol !== -1 ? toNumber(row[orgCol]) : 0;

    // Reasons (we use them for top-10 ranking)
    const reasonsByShiftDay: Record<string, number> = {};
    const reasonsByShiftNight: Record<string, number> = {};
    for (const { col, label } of reasonCols) {
      const v = toNumber(row[col]);
      if (v > 0) {
        // We don't know day vs night per reason; ТЗ does not require it for top-10.
        // Distribute proportionally to dayMin/nightMin so we can keep counters separated.
        const ratio = dayMin + nightMin > 0 ? dayMin / (dayMin + nightMin) : 0.5;
        reasonsByShiftDay[label] = (reasonsByShiftDay[label] ?? 0) + v * ratio;
        reasonsByShiftNight[label] = (reasonsByShiftNight[label] ?? 0) + v * (1 - ratio);
        reasonTotals[label] = (reasonTotals[label] ?? 0) + v;
      }
    }

    days.push({
      day: dayNum,
      shifts: { day: dayMin, night: nightMin },
      byCategory: {
        mechanical: { day: mech * (dayMin / (dayMin + nightMin || 1)), night: mech * (nightMin / (dayMin + nightMin || 1)) },
        electrical: { day: elec * (dayMin / (dayMin + nightMin || 1)), night: elec * (nightMin / (dayMin + nightMin || 1)) },
        organizational: { day: org * (dayMin / (dayMin + nightMin || 1)), night: org * (nightMin / (dayMin + nightMin || 1)) },
      },
      reasonsByShift: { day: reasonsByShiftDay, night: reasonsByShiftNight },
    });

    totals.mechanical += mech;
    totals.electrical += elec;
    totals.organizational += org;
    totals.total += toNumber(row[totalCol]);
  }

  // Fallback: if classifications were absent, compute total from day+night sums.
  if (totals.mechanical + totals.electrical + totals.organizational === 0) {
    totals.total = days.reduce((s, d) => s + d.shifts.day + d.shifts.night, 0);
  }

  return { area, days, totals };
}

export function topReasons(downtime: AreaDowntime, n = 10): Array<{ label: string; minutes: number }> {
  const map: Record<string, number> = {};
  for (const d of downtime.days) {
    for (const [k, v] of Object.entries(d.reasonsByShift.day)) {
      map[k] = (map[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(d.reasonsByShift.night)) {
      map[k] = (map[k] ?? 0) + v;
    }
  }
  return Object.entries(map)
    .map(([label, minutes]) => ({ label, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, n);
}

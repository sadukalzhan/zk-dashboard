// Parser for shift report sheets: "N день" / "N ночь" (1..31).
// Layout (line 1 example):
//   R001-R005: header (date, shift, master)
//   R007 "Пресс N"            → next "Итого, м2" row has totals
//   R017 "Линия глазурования N" → next "Итого, м2" row has totals
//   R029 "Печь N"             → next "Итого, м2"
//   R038 "Ректификация N"      → next "Итого, м2"
//   R047 "Сортировка и Упаковка N" → next "Итого, м2"
//   Right side (col ~15-17): "Потери по переделам" + technical params

import type { LineNumber, ShiftReport, SheetGrid } from "../../types";
import { LINE_SECTIONS } from "../../line-mapping";
import { cell, findRowContaining, parseDateCell, toNumber, toStr } from "../../sheet-utils";

export function parseShiftReport(
  sheetName: string,
  grid: SheetGrid,
  line: LineNumber,
): ShiftReport | null {
  if (!grid.length) return null;

  // Sheet name like "1 день" / "12 ночь"
  const m = sheetName.match(/^(\d+)\s+(день|ночь)/i);
  if (!m) return null;
  const day = Number(m[1]);
  const shift: "day" | "night" = m[2].toLowerCase() === "день" ? "day" : "night";

  const sections = LINE_SECTIONS[line];

  // Try to find date in the header area (row containing "Дата")
  let date: string | undefined;
  for (let r = 0; r < Math.min(10, grid.length); r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      if (toStr(row[c]).toLowerCase() === "дата") {
        const dt = parseDateCell(cell(grid, r, c + 1));
        if (dt) date = dt.toISOString().slice(0, 10);
        break;
      }
    }
    if (date) break;
  }

  // Helpers: find a section header row and the next "Итого" row.
  const findSection = (label: string): number => findRowContaining(grid, label);
  const findNextTotalsAfter = (rowStart: number): number => {
    for (let r = rowStart + 1; r < Math.min(grid.length, rowStart + 30); r++) {
      const v = toStr(cell(grid, r, 1)) || toStr(cell(grid, r, 2));
      if (/итого/i.test(v)) return r;
    }
    return -1;
  };

  // --- PRESS ---
  const pressRow = findSection(sections.press);
  let pressTotalM2 = 0, pressWorkMin = 0, pressDownMin = 0;
  if (pressRow !== -1) {
    const tot = findNextTotalsAfter(pressRow);
    if (tot !== -1) {
      // Press totals: C6=production m², C7=work min, C8=downtime min
      pressTotalM2 = toNumber(cell(grid, tot, 5));
      pressWorkMin = toNumber(cell(grid, tot, 6));
      pressDownMin = toNumber(cell(grid, tot, 7));
    }
  }

  // --- LG ---
  const lgRow = findSection(sections.lg);
  let lgIn = 0, lgOut = 0, lgDown = 0, lgEff: number | undefined;
  if (lgRow !== -1) {
    const tot = findNextTotalsAfter(lgRow);
    if (tot !== -1) {
      lgIn = toNumber(cell(grid, tot, 5));
      lgOut = toNumber(cell(grid, tot, 6));
      lgDown = toNumber(cell(grid, tot, 7));
      // EFF appears in C13 of same row (after "EFF." label in C12)
      const effLabel = toStr(cell(grid, tot, 11));
      if (/eff/i.test(effLabel)) {
        lgEff = toNumber(cell(grid, tot, 12));
      }
    }
  }

  // --- KILN ---
  const kilnRow = findSection(sections.kiln);
  let kilnIn = 0, kilnOut = 0, kilnDown = 0;
  if (kilnRow !== -1) {
    const tot = findNextTotalsAfter(kilnRow);
    if (tot !== -1) {
      // Kiln totals: C5=loaded in m², C7=loaded on platforms m²
      kilnIn = toNumber(cell(grid, tot, 4));
      kilnOut = toNumber(cell(grid, tot, 6));
      kilnDown = toNumber(cell(grid, tot, 7));
    }
  }

  // --- RECTIFICATION ---
  const rectRow = findSection(sections.rectification);
  let rectIn = 0;
  const rectOut = 0;
  let rectLosses = 0;
  if (rectRow !== -1) {
    const tot = findNextTotalsAfter(rectRow);
    if (tot !== -1) {
      rectIn = toNumber(cell(grid, tot, 3));
      // Counters in C5/C6 are pieces (not m²); we keep losses
      rectLosses = toNumber(cell(grid, tot, 6));
    }
  }

  // --- SORTING/PACKAGING ---
  const sortRow = findSection(sections.sorting);
  let sortIn = 0, aClass = 0, bClass = 0, defect = 0;
  if (sortRow !== -1) {
    const tot = findNextTotalsAfter(sortRow);
    if (tot !== -1) {
      // Sorting totals: C5=A м², C7=B м², C9=Брак м², C11=Итого
      aClass = toNumber(cell(grid, tot, 4));
      bClass = toNumber(cell(grid, tot, 6));
      defect = toNumber(cell(grid, tot, 8));
      sortIn = toNumber(cell(grid, tot, 10));
    }
  }

  // --- Technical parameters (right side) ---
  // Look for rows in cols 15-16 with labels: Цикл пресса, Цикл обжига, Температура обжига
  let pressCycleMin: number | undefined;
  let kilnCycleMin: number | undefined;
  let kilnTemperatureC: number | undefined;
  for (let r = 0; r < grid.length; r++) {
    const label = toStr(cell(grid, r, 14)).toLowerCase();
    const val = toNumber(cell(grid, r, 15));
    if (!label) continue;
    if (label.includes("цикл пресса") && val > 0) pressCycleMin = val;
    else if (label.includes("цикл обжига") && val > 0) kilnCycleMin = val;
    else if (label.includes("температура обжига") && val > 0) kilnTemperatureC = val;
  }

  return {
    day,
    shift,
    date,
    press: {
      productions: [],
      totalM2: pressTotalM2,
      workMin: pressWorkMin,
      downMin: pressDownMin,
    },
    lg: { inM2: lgIn, outM2: lgOut, workMin: 0, downMin: lgDown },
    kiln: {
      inM2: kilnIn,
      outM2: kilnOut,
      workMin: 0,
      downMin: kilnDown,
      cycleMin: kilnCycleMin,
      temperature: kilnTemperatureC,
    },
    rectification: { inM2: rectIn, outM2: rectOut, losses: rectLosses },
    sorting: { inM2: sortIn, aClassM2: aClass, bClassM2: bClass, defectM2: defect },
    oee: lgEff !== undefined ? lgEff : undefined,
    technicalParams: {
      pressCycleMin,
      kilnCycleMin,
      kilnTemperatureC,
    },
  };
}

// Build sheet name list for a month: "1 день", "1 ночь", ..., "31 день", "31 ночь"
export function shiftSheetNames(): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 31; d++) {
    out.push(`${d} день`);
    out.push(`${d} ночь`);
  }
  return out;
}

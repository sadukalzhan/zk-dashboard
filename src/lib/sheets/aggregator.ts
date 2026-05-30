// Aggregates all sheet data for a (line, year, month) into a single LineMonthData.
// Caches results in-memory for 15 minutes.

import type { AreaDowntime, DowntimeArea, LineMonthData, LineNumber, ShiftReport } from "../types";
import { findSource } from "../store/sources";
import { fetchSheetsByNames } from "./fetcher";
import { parseMonthlyOutput } from "./parsers/monthly-output";
import { parseDowntime } from "./parsers/downtime";
import { parseShiftReport, shiftSheetNames } from "./parsers/shift-report";

type CacheEntry = { data: LineMonthData; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 15 * 60 * 1000);

const DOWNTIME_SHEETS: { area: DowntimeArea; name: string }[] = [
  { area: "press", name: "Простои пресса" },
  { area: "lg", name: "Простои линии глазурования" },
  { area: "kiln", name: "Простои печи" },
  { area: "rectification", name: "Простои ректификации" },
  { area: "sortingPacking", name: "Простои сортировки и упаковки" },
];

function cacheKey(line: LineNumber, year: number, month: number): string {
  return `${line}-${year}-${month}`;
}

export function invalidateCache(): void {
  cache.clear();
}

export async function getLineMonthData(
  line: LineNumber,
  year: number,
  month: number,
  options: { force?: boolean } = {},
): Promise<LineMonthData> {
  const key = cacheKey(line, year, month);
  if (!options.force) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  const source = await findSource(line, year, month);
  const errors: string[] = [];

  if (!source) {
    const empty: LineMonthData = {
      line,
      year,
      month,
      monthly: null,
      downtime: {},
      shifts: [],
      packaging: null,
      kpi: null,
      parameters: null,
      losses: [],
      heatmap: [],
      errors: [`Источник для линии ${line}, ${month}/${year} не настроен. Откройте панель настроек.`],
    };
    return empty;
  }

  const sheetNamesToFetch = [
    "Выход и простои печи по месяцам",
    ...DOWNTIME_SHEETS.map((d) => d.name),
    ...shiftSheetNames(),
  ];

  let fetched;
  try {
    fetched = await fetchSheetsByNames(source.spreadsheetId, sheetNamesToFetch);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Ошибка загрузки данных: ${msg}`);
    const empty: LineMonthData = {
      line,
      year,
      month,
      source,
      monthly: null,
      downtime: {},
      shifts: [],
      packaging: null,
      kpi: null,
      parameters: null,
      losses: [],
      heatmap: [],
      errors,
    };
    return empty;
  }

  const sheetMap = new Map(fetched.map((f) => [f.sheetName, f.grid] as const));

  // Monthly trend
  const monthly = parseMonthlyOutput(sheetMap.get("Выход и простои печи по месяцам") ?? []);

  // Downtime per area
  const downtime: Partial<Record<DowntimeArea, AreaDowntime>> = {};
  for (const d of DOWNTIME_SHEETS) {
    const grid = sheetMap.get(d.name);
    if (grid) {
      const parsed = parseDowntime(d.area, grid);
      if (parsed) downtime[d.area] = parsed;
    }
  }

  // Shifts
  const shifts: ShiftReport[] = [];
  for (let dayN = 1; dayN <= 31; dayN++) {
    for (const shiftLabel of ["день", "ночь"] as const) {
      const sheetName = `${dayN} ${shiftLabel}`;
      const grid = sheetMap.get(sheetName);
      if (!grid || !grid.length) continue;
      const sr = parseShiftReport(sheetName, grid, line);
      if (sr) {
        // Only keep shifts with actual data (any production or downtime)
        const anyData =
          sr.press.totalM2 > 0 ||
          sr.lg.outM2 > 0 ||
          sr.kiln.outM2 > 0 ||
          sr.sorting.aClassM2 > 0 ||
          sr.sorting.bClassM2 > 0 ||
          sr.sorting.defectM2 > 0;
        if (anyData) shifts.push(sr);
      }
    }
  }

  // KPI (current month) + previous month for delta
  const thisMonthRow = monthly?.byMonth.find((m) => m.monthNumber === month);
  const prevMonthRow = monthly?.byMonth.find((m) => m.monthNumber === month - 1);

  // Packaging aggregates from shifts
  const aClass = shifts.reduce((s, x) => s + x.sorting.aClassM2, 0);
  const bClass = shifts.reduce((s, x) => s + x.sorting.bClassM2, 0);
  const defect = shifts.reduce((s, x) => s + x.sorting.defectM2, 0);
  const totalSorted = aClass + bClass + defect;

  const packaging = totalSorted > 0
    ? {
        aClassM2: aClass,
        bClassM2: bClass,
        defectM2: defect,
        aClassPct: (aClass / totalSorted) * 100,
        bClassPct: (bClass / totalSorted) * 100,
        defectPct: (defect / totalSorted) * 100,
        totalM2: totalSorted,
      }
    : null;

  // Total monthly downtime (sum across areas)
  const totalDowntimeMin = Object.values(downtime).reduce(
    (s, d) => s + (d?.totals.total ?? 0),
    0,
  );

  // OEE: average from shifts (where reported)
  const oeeValues = shifts.map((s) => s.oee).filter((v): v is number => typeof v === "number" && v > 0);
  const oeeAvg = oeeValues.length ? (oeeValues.reduce((s, v) => s + v, 0) / oeeValues.length) : undefined;

  const kpi = thisMonthRow
    ? {
        outputM2: thisMonthRow.outputM2,
        outputPrevM2: prevMonthRow?.outputM2,
        downtimeMin: totalDowntimeMin || thisMonthRow.downtimeMin,
        oee: oeeAvg,
        aClassM2: aClass,
        bClassM2: bClass,
        defectM2: defect,
      }
    : null;

  // Parameters: averages from shifts
  const param = (key: "pressCycleMin" | "kilnCycleMin" | "kilnTemperatureC"): number | undefined => {
    const arr = shifts
      .map((s) => s.technicalParams?.[key])
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (!arr.length) return undefined;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  };

  const parameters = {
    pressCycleMin: param("pressCycleMin"),
    kilnCycleMin: param("kilnCycleMin"),
    kilnTemperatureC: param("kilnTemperatureC"),
    oee: oeeAvg,
  };

  // Losses by stage (press → dryer → LG → kiln → rect → sort → warehouse)
  const totalPress = shifts.reduce((s, x) => s + x.press.totalM2, 0);
  const totalLgIn = shifts.reduce((s, x) => s + x.lg.inM2, 0);
  const totalLgOut = shifts.reduce((s, x) => s + x.lg.outM2, 0);
  const totalKilnIn = shifts.reduce((s, x) => s + x.kiln.inM2, 0);
  const totalKilnOut = shifts.reduce((s, x) => s + x.kiln.outM2, 0);
  const totalRectIn = shifts.reduce((s, x) => s + x.rectification.inM2, 0);
  const totalSortIn = shifts.reduce((s, x) => s + x.sorting.inM2, 0);

  const losses = [
    { stage: "Пресс", inM2: 0, outM2: totalPress, lossesM2: 0, lossesPct: 0 },
    { stage: "Сушилка", inM2: totalPress, outM2: totalPress, lossesM2: 0, lossesPct: 0 },
    {
      stage: "Линия глазурования",
      inM2: totalLgIn,
      outM2: totalLgOut,
      lossesM2: Math.max(0, totalLgIn - totalLgOut),
      lossesPct: totalLgIn > 0 ? ((totalLgIn - totalLgOut) / totalLgIn) * 100 : 0,
    },
    {
      stage: "Печь",
      inM2: totalKilnIn,
      outM2: totalKilnOut,
      lossesM2: Math.max(0, totalKilnIn - totalKilnOut),
      lossesPct: totalKilnIn > 0 ? ((totalKilnIn - totalKilnOut) / totalKilnIn) * 100 : 0,
    },
    {
      stage: "Ректификация",
      inM2: totalRectIn,
      outM2: Math.max(0, totalRectIn - shifts.reduce((s, x) => s + (x.rectification.losses ?? 0), 0)),
      lossesM2: shifts.reduce((s, x) => s + (x.rectification.losses ?? 0), 0),
      lossesPct: totalRectIn > 0 ? (shifts.reduce((s, x) => s + (x.rectification.losses ?? 0), 0) / totalRectIn) * 100 : 0,
    },
    {
      stage: "Сортировка/Упаковка",
      inM2: totalSortIn,
      outM2: aClass + bClass,
      lossesM2: defect,
      lossesPct: totalSortIn > 0 ? (defect / totalSortIn) * 100 : 0,
    },
    {
      stage: "Склад",
      inM2: aClass + bClass,
      outM2: aClass + bClass,
      lossesM2: 0,
      lossesPct: 0,
    },
  ];

  // Heatmap: per-area day/night breakdown for blocks press, lg, kiln, rectification
  const heatmapAreas: DowntimeArea[] = ["press", "lg", "kiln", "rectification"];
  const heatmap = heatmapAreas
    .map((area) => {
      const d = downtime[area];
      if (!d) return null;
      const days = d.days.map((day) => ({
        day: day.day,
        dayMin: day.shifts.day,
        nightMin: day.shifts.night,
      }));
      return { area, days };
    })
    .filter((x): x is { area: DowntimeArea; days: { day: number; dayMin: number; nightMin: number }[] } => !!x);

  const result: LineMonthData = {
    line,
    year,
    month,
    source,
    monthly,
    downtime,
    shifts,
    packaging,
    kpi,
    parameters,
    losses,
    heatmap,
    errors,
  };

  cache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

// Mapping of line number → section names used in the spreadsheet.
// Per ТЗ Table 13: rectification and sorting have REVERSED numbering.

import type { LineNumber } from "./types";

export type LineSections = {
  press: string;
  lg: string;
  kiln: string;
  rectification: string;
  sorting: string;
  format: string;
};

export const LINE_SECTIONS: Record<LineNumber, LineSections> = {
  1: {
    press: "Пресс 1",
    lg: "Линия глазурования 1",
    kiln: "Печь 1",
    rectification: "Ректификация 2",
    sorting: "Сортировка и Упаковка 2",
    format: "120×60 см",
  },
  2: {
    press: "Пресс 2",
    lg: "Линия глазурования 2",
    kiln: "Печь 2",
    rectification: "Ректификация 1",
    sorting: "Сортировка и Упаковка 1",
    format: "60×60 см",
  },
  // Линия 1 в формате 60×60: то же оборудование, что у линии 1, другой формат.
  // TODO: сверить названия участков с реальной таблицей этой линии.
  3: {
    press: "Пресс 1",
    lg: "Линия глазурования 1",
    kiln: "Печь 1",
    rectification: "Ректификация 2",
    sorting: "Сортировка и Упаковка 2",
    format: "60×60 см",
  },
};

export const LINE_LABELS: Record<LineNumber, { short: string; long: string }> = {
  1: { short: "Линия 1 · 120×60", long: "Линия 1 (ЗК-120/60, 120×60 см)" },
  2: { short: "Линия 2 · 60×60", long: "Линия 2 (ЗК-60/60, 60×60 см)" },
  3: { short: "Линия 1 · 60×60", long: "Линия 1 (60×60 см)" },
};

// Порядок линий в интерфейсе: оба формата линии 1 рядом, затем линия 2.
export const LINE_NUMBERS: LineNumber[] = [1, 3, 2];

export const MONTH_NAMES_RU = [
  "ЯНВАРЬ",
  "ФЕВРАЛЬ",
  "МАРТ",
  "АПРЕЛЬ",
  "МАЙ",
  "ИЮНЬ",
  "ИЮЛЬ",
  "АВГУСТ",
  "СЕНТЯБРЬ",
  "ОКТЯБРЬ",
  "НОЯБРЬ",
  "ДЕКАБРЬ",
];

export const MONTH_NAMES_RU_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export function monthNameRu(month: number): string {
  return MONTH_NAMES_RU[month - 1] ?? "";
}

export function monthIndexByName(name: string): number | null {
  const idx = MONTH_NAMES_RU.findIndex((m) => m.toUpperCase() === name.toUpperCase());
  return idx === -1 ? null : idx + 1;
}

// Парсер вкладки «Сводная»: берём итоги упаковки за месяц.
//
// Раскладка: шапка в несколько строк, группа «Упаковка» делится на подколонки
// «А», «В», «Брак», «Итого» (между ними идут колонки с процентами).
// Ниже — строки по датам, последняя строка с «Итого» во втором столбце.

import type { SheetGrid } from "../../types";
import { cell, toNumber, toStr } from "../../sheet-utils";

export type SummaryPackaging = {
  aClassM2: number;
  bClassM2: number;
  defectM2: number;
  totalM2: number;
};

const norm = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

// «А класс» может быть записан как кириллицей, так и латиницей.
const A_LABELS = new Set(["а", "a", "а класс", "a класс"]);
const B_LABELS = new Set(["в", "b", "в класс", "b класс"]);
const DEFECT_LABELS = new Set(["брак"]);

export function parseSummaryPackaging(grid: SheetGrid): SummaryPackaging | null {
  if (!grid.length) return null;

  // Строка итогов: «Итого» в первой паре столбцов.
  const totalsRow = grid.findIndex(
    (row) => norm(toStr(row?.[1])) === "итого" || norm(toStr(row?.[2])) === "итого",
  );
  if (totalsRow === -1) return null;

  // Колонка группы «Упаковка» в шапке (шапка — всё, что выше строки итогов).
  let packCol = -1;
  for (let r = 0; r < totalsRow && packCol === -1; r++) {
    const row = grid[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (norm(toStr(row[c])) === "упаковка") {
        packCol = c;
        break;
      }
    }
  }
  if (packCol === -1) return null;

  // Подколонки ищем правее «Упаковки», в пределах группы.
  const findCol = (labels: Set<string>): number => {
    for (let c = packCol; c < packCol + 12; c++) {
      for (let r = 0; r < totalsRow; r++) {
        if (labels.has(norm(toStr(cell(grid, r, c))))) return c;
      }
    }
    return -1;
  };

  const aCol = findCol(A_LABELS);
  const bCol = findCol(B_LABELS);
  const defectCol = findCol(DEFECT_LABELS);
  if (aCol === -1 || bCol === -1 || defectCol === -1) return null;

  const aClassM2 = toNumber(cell(grid, totalsRow, aCol));
  const bClassM2 = toNumber(cell(grid, totalsRow, bCol));
  const defectM2 = toNumber(cell(grid, totalsRow, defectCol));
  const totalM2 = aClassM2 + bClassM2 + defectM2;
  if (totalM2 <= 0) return null;

  return { aClassM2, bClassM2, defectM2, totalM2 };
}

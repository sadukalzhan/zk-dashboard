// Helpers for working with spreadsheet grids (2D arrays).

import type { CellValue, SheetGrid } from "./types";

export function toNumber(value: CellValue): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const s = String(value).trim();
  if (!s) return 0;
  // Excel/Russian locale: comma decimals, spaces as thousand separators
  const normalized = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function toStr(value: CellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function cellLooksLikeDate(value: CellValue): boolean {
  if (value && typeof value === "object" && value instanceof Date) return true;
  const s = toStr(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(s);
}

export function parseDateCell(value: CellValue): Date | null {
  if (value && typeof value === "object" && value instanceof Date) return value;
  const s = toStr(value).trim();
  if (!s) return null;
  // Russian/Kazakh sheets use dd.mm.yyyy. Check this FIRST, otherwise JS
  // Date interprets "01.05.2026" as mm.dd.yyyy (Jan 5) — silently wrong.
  const ddmm = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (ddmm) {
    const dd = ddmm[1];
    const mm = ddmm[2];
    let yyyy = ddmm[3];
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`);
  }
  // ISO yyyy-mm-dd or other formats Date can parse safely.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Find a row index whose cells (joined) contain ALL given keywords (case-insensitive).
export function findRowByAll(grid: SheetGrid, keywords: string[], startRow = 0): number {
  const kw = keywords.map((k) => k.toLowerCase());
  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r];
    const joined = row.map((c) => toStr(c)).join(" \u0001 ").toLowerCase();
    if (kw.every((k) => joined.includes(k))) return r;
  }
  return -1;
}

export function findRowContaining(grid: SheetGrid, text: string, startRow = 0): number {
  return findRowByAll(grid, [text], startRow);
}

// Find first column where header cell contains text (in given header row).
export function findColInRow(grid: SheetGrid, rowIdx: number, text: string): number {
  if (rowIdx < 0 || rowIdx >= grid.length) return -1;
  const t = text.toLowerCase();
  const row = grid[rowIdx];
  for (let c = 0; c < row.length; c++) {
    if (toStr(row[c]).toLowerCase().includes(t)) return c;
  }
  return -1;
}

export function cell(grid: SheetGrid, r: number, c: number): CellValue {
  if (r < 0 || r >= grid.length) return null;
  const row = grid[r];
  if (!row || c < 0 || c >= row.length) return null;
  return row[c];
}

export function safeSlice(grid: SheetGrid, r0: number, r1: number): SheetGrid {
  return grid.slice(Math.max(0, r0), Math.max(0, r1));
}

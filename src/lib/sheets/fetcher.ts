// Google Sheets fetcher.
// Strategy: prefer Google Sheets API v4 (with API key) for batch reads.
// Falls back to public gviz CSV endpoint (no API key, works for public sheets).

import type { SheetGrid, CellValue } from "../types";

const GOOGLE_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

export type FetchResult = {
  sheetName: string;
  grid: SheetGrid;
};

export function extractSpreadsheetId(url: string): string | null {
  // https://docs.google.com/spreadsheets/d/{ID}/edit...
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

type SheetMeta = { sheetId: number; title: string; rowCount: number; columnCount: number };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function getSheetMetadata(spreadsheetId: string): Promise<SheetMeta[]> {
  if (GOOGLE_API_KEY) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties&key=${GOOGLE_API_KEY}`;
    const data = await fetchJson<{
      sheets: Array<{ properties: { sheetId: number; title: string; gridProperties: { rowCount: number; columnCount: number } } }>;
    }>(url);
    return data.sheets.map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties.rowCount,
      columnCount: s.properties.gridProperties.columnCount,
    }));
  }
  throw new Error(
    "GOOGLE_SHEETS_API_KEY не задан. Без него нельзя получить список листов. " +
      "Задайте переменную окружения GOOGLE_SHEETS_API_KEY."
  );
}

// Batch-fetch multiple sheets (full ranges) using values.batchGet.
export async function fetchSheetsByNames(
  spreadsheetId: string,
  sheetNames: string[],
): Promise<FetchResult[]> {
  if (!sheetNames.length) return [];

  if (GOOGLE_API_KEY) {
    const ranges = sheetNames.map((n) => encodeURIComponent(`'${n.replace(/'/g, "''")}'`));
    const rangeParams = ranges.map((r) => `ranges=${r}`).join("&");
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet` +
      `?${rangeParams}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&key=${GOOGLE_API_KEY}`;
    const data = await fetchJson<{ valueRanges: Array<{ range: string; values?: CellValue[][] }> }>(url);
    return sheetNames.map((name, i) => ({
      sheetName: name,
      grid: (data.valueRanges[i]?.values ?? []) as SheetGrid,
    }));
  }

  // Fallback: gviz CSV endpoint (works only for publicly-shared sheets without API key)
  const results: FetchResult[] = [];
  for (const name of sheetNames) {
    const grid = await fetchPublicCsv(spreadsheetId, name);
    results.push({ sheetName: name, grid });
  }
  return results;
}

// Public CSV via gviz (works for "Anyone with the link" published sheets, no API key needed).
async function fetchPublicCsv(spreadsheetId: string, sheetName: string): Promise<SheetGrid> {
  const url =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Не удалось получить лист "${sheetName}" по CSV (HTTP ${res.status})`);
  }
  const text = await res.text();
  return parseCsv(text);
}

// Minimal CSV parser handling quoted fields and embedded commas/newlines.
export function parseCsv(text: string): SheetGrid {
  const rows: SheetGrid = [];
  let cur: CellValue[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          buf += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        buf += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cur.push(coerce(buf));
        buf = "";
      } else if (ch === "\n") {
        cur.push(coerce(buf));
        rows.push(cur);
        cur = [];
        buf = "";
      } else if (ch === "\r") {
        // ignore
      } else {
        buf += ch;
      }
    }
  }
  if (buf.length || cur.length) {
    cur.push(coerce(buf));
    rows.push(cur);
  }
  return rows;
}

function coerce(s: string): CellValue {
  if (s === "") return "";
  // Try number first (handle Russian decimals "," AND remove non-breaking/regular thousand spaces)
  const normalized = s.replace(/\u00A0/g, "").replace(/\s/g, "").replace(",", ".");
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }
  return s;
}

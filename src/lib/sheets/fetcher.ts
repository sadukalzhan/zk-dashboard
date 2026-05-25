// Google Sheets fetcher.
// Auth modes (in order of preference):
//   1) Service Account JSON (GOOGLE_SERVICE_ACCOUNT_JSON env var or
//      GOOGLE_APPLICATION_CREDENTIALS file path) — recommended.
//   2) API key (GOOGLE_SHEETS_API_KEY env var) — works for public sheets only.
//   3) Public gviz CSV fallback — no auth, only for "Anyone with the link" sheets.

import { google, sheets_v4 } from "googleapis";
import { GoogleAuth, JWT } from "google-auth-library";
import type { SheetGrid, CellValue } from "../types";

const GOOGLE_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SERVICE_ACCOUNT_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS;

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

// ---------- Auth ----------

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  type?: string;
};

let cachedJwt: JWT | null = null;

function loadServiceAccount(): ServiceAccountKey | null {
  if (SERVICE_ACCOUNT_JSON_RAW) {
    try {
      // Allow base64-encoded JSON (easier to set in Vercel env)
      let raw = SERVICE_ACCOUNT_JSON_RAW.trim();
      if (!raw.startsWith("{")) {
        try {
          raw = Buffer.from(raw, "base64").toString("utf-8");
        } catch {
          // not base64, fall through
        }
      }
      const parsed = JSON.parse(raw) as ServiceAccountKey;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch (e) {
      console.warn("Не удалось распарсить GOOGLE_SERVICE_ACCOUNT_JSON:", (e as Error).message);
    }
  }
  return null;
}

function getServiceAccountAuth(): JWT | GoogleAuth | null {
  if (cachedJwt) return cachedJwt;
  const sa = loadServiceAccount();
  if (sa) {
    cachedJwt = new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return cachedJwt;
  }
  if (SERVICE_ACCOUNT_FILE) {
    return new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  }
  return null;
}

let cachedSheetsClient: sheets_v4.Sheets | null = null;
async function getSheetsClient(): Promise<sheets_v4.Sheets | null> {
  if (cachedSheetsClient) return cachedSheetsClient;
  const auth = getServiceAccountAuth();
  if (!auth) return null;
  cachedSheetsClient = google.sheets({ version: "v4", auth: auth as JWT });
  return cachedSheetsClient;
}

// ---------- Public API ----------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function getSheetMetadata(spreadsheetId: string): Promise<SheetMeta[]> {
  const client = await getSheetsClient();
  if (client) {
    const resp = await client.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const sheets = resp.data.sheets ?? [];
    return sheets.map((s) => {
      const p = s.properties!;
      return {
        sheetId: p.sheetId ?? 0,
        title: p.title ?? "",
        rowCount: p.gridProperties?.rowCount ?? 0,
        columnCount: p.gridProperties?.columnCount ?? 0,
      };
    });
  }
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
    "Не настроен Google Sheets API. Задайте GOOGLE_SERVICE_ACCOUNT_JSON (рекомендуется) или GOOGLE_SHEETS_API_KEY."
  );
}

// Batch-fetch multiple sheets (full ranges) using values.batchGet.
export async function fetchSheetsByNames(
  spreadsheetId: string,
  sheetNames: string[],
): Promise<FetchResult[]> {
  if (!sheetNames.length) return [];

  const client = await getSheetsClient();
  if (client) {
    const resp = await client.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: sheetNames.map((n) => `'${n.replace(/'/g, "''")}'`),
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const ranges = resp.data.valueRanges ?? [];
    return sheetNames.map((name, i) => ({
      sheetName: name,
      grid: (ranges[i]?.values ?? []) as SheetGrid,
    }));
  }

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

  // Last-resort fallback: gviz CSV (only public sheets)
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

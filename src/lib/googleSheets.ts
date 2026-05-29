import { google, sheets_v4 } from "googleapis";
import type { MovementRow, SaleRow, SheetGrid } from "./types";

const DEFAULT_FINISHED_PRODUCTS_SPREADSHEET_ID = "1limNj0Txl82lYeBrflyhpeckmvi9-xEkpb0QXcrhYro";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
};

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTH_MAP = new Map<string, number>(
  MONTHS.flatMap((m, i) => [
    [normalizeKey(m), i + 1],
    [normalizeKey(m.slice(0, 3)), i + 1],
  ]),
);

let cachedSheetsClient: sheets_v4.Sheets | null = null;

export function invalidateFinishedProductsSheetsCache(): void {
  cache.clear();
  cachedSheetsClient = null;
}

function spreadsheetId(): string {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_FINISHED_PRODUCTS_SPREADSHEET_ID;
}

function loadServiceAccount(): ServiceAccountKey | null {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const raw = rawJson.startsWith("{") ? rawJson : Buffer.from(rawJson, "base64").toString("utf-8");
      const parsed = JSON.parse(raw) as ServiceAccountKey;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      return null;
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) return null;
  return {
    client_email: email,
    private_key: key.replace(/\\n/g, "\n"),
  };
}

async function sheetsClient(): Promise<sheets_v4.Sheets> {
  if (cachedSheetsClient) return cachedSheetsClient;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Не настроен сервисный аккаунт Google Sheets. Добавьте GOOGLE_SERVICE_ACCOUNT_JSON или GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  cachedSheetsClient = google.sheets({ version: "v4", auth });
  return cachedSheetsClient;
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function fetchSheet(sheetName: string, range = "A:Z"): Promise<SheetGrid> {
  const cacheKey = `sheet:${spreadsheetId()}:${sheetName}:${range}`;
  return cached(cacheKey, async () => {
    const client = await sheetsClient();
    const resp = await client.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `'${sheetName.replace(/'/g, "''")}'!${range}`,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    return (resp.data.values ?? []) as SheetGrid;
  });
}

export async function getStructuredData(): Promise<SaleRow[]> {
  const rows = await fetchSheet("Structured Data");
  return parseStructuredData(rows);
}

export async function getMovementData(): Promise<MovementRow[]> {
  const rows = await fetchSheet("Отчет 3 - Движение");
  return parseMovementData(rows);
}

function parseStructuredData(rows: SheetGrid): SaleRow[] {
  const { headers, body } = splitSheet(rows);
  return body
    .map((row) => {
      const month = text(cell(row, headers, ["месяц", "month"]));
      const type = normalizeKey(text(cell(row, headers, ["тип", "type"])));
      const parsedType = type.includes("made") || type.includes("производ") ? "made" : "sale";
      return {
        brand: text(cell(row, headers, ["бренд", "brand"])),
        type: parsedType as "made" | "sale",
        format: parseFormat(cell(row, headers, ["формат", "format"])),
        month,
        monthNumber: monthNumber(month),
        year: number(cell(row, headers, ["год", "year"])),
        design: text(cell(row, headers, ["дизайн", "design"])),
        grade: text(cell(row, headers, ["сорт", "grade"])),
        quantity: number(cell(row, headers, ["количество", "quantity"])),
      };
    })
    .filter((row) => row.brand || row.design || row.quantity);
}

function parseMovementData(rows: SheetGrid): MovementRow[] {
  const { headers, body } = splitSheet(rows);
  return body
    .map((row) => {
      const month = text(cell(row, headers, ["месяц", "month"]));
      return {
        brand: text(cell(row, headers, ["бренд", "brand"])),
        design: text(cell(row, headers, ["дизайн", "design"])),
        grade: text(cell(row, headers, ["сорт", "grade"])),
        format: parseFormat(cell(row, headers, ["формат", "format"])),
        month,
        monthNumber: monthNumber(month),
        year: number(cell(row, headers, ["год", "year"])),
        produced: number(cell(row, headers, ["производство", "made", "produced"])),
        sold: number(cell(row, headers, ["продажа", "sale", "sold"])),
        balance: number(cell(row, headers, ["остаток", "balance"])),
      };
    })
    .filter((row) => row.brand || row.design || row.balance || row.produced || row.sold);
}

function splitSheet(rows: SheetGrid): { headers: Map<string, number>; body: SheetGrid } {
  const headerRow = rows[0] ?? [];
  const headers = new Map<string, number>();
  headerRow.forEach((value, index) => {
    const key = normalizeKey(text(value));
    if (key) headers.set(key, index);
  });
  return { headers, body: rows.slice(1) };
}

function cell(row: SheetGrid[number], headers: Map<string, number>, names: string[]) {
  for (const name of names) {
    const normalized = normalizeKey(name);
    const exact = headers.get(normalized);
    if (exact !== undefined) return row[exact];
    const partial = [...headers.entries()].find(([key]) => key.includes(normalized) || normalized.includes(key));
    if (partial) return row[partial[1]];
  }
  return "";
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = text(value).replace(/\u00a0/g, "").replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFormat(value: unknown): 60 | 120 {
  const raw = text(value);
  return raw.includes("120") ? 120 : 60;
}

function monthNumber(month: string): number {
  return MONTH_MAP.get(normalizeKey(month)) ?? 0;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/g, "");
}

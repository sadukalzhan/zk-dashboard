// Sources store: persists list of Google Sheets URLs per (line, year, month).
// Local dev: JSON file at data/sources.json.
// Production (Vercel): Upstash Redis if configured, otherwise read-only env-supplied JSON.

import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { LineNumber, SourceEntry } from "../types";
import { extractSpreadsheetId } from "../sheets/fetcher";

const DATA_FILE = path.join(process.cwd(), "data", "sources.json");
const KEY = "zk_dashboard:sources";

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

async function readFromFile(): Promise<SourceEntry[]> {
  try {
    const text = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return [];
    throw e;
  }
}

async function writeToFile(sources: SourceEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(sources, null, 2), "utf-8");
}

export async function listSources(): Promise<SourceEntry[]> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<SourceEntry[]>(KEY);
    return data ?? [];
  }
  return readFromFile();
}

export async function saveAllSources(sources: SourceEntry[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(KEY, sources);
    return;
  }
  await writeToFile(sources);
}

export async function findSource(line: LineNumber, year: number, month: number): Promise<SourceEntry | null> {
  const all = await listSources();
  return all.find((s) => s.line === line && s.year === year && s.month === month) ?? null;
}

export async function upsertSource(input: {
  line: LineNumber;
  year: number;
  month: number;
  url: string;
}): Promise<SourceEntry> {
  const spreadsheetId = extractSpreadsheetId(input.url);
  if (!spreadsheetId) {
    throw new Error("Не удалось распознать ID Google Sheets в URL. Проверьте ссылку.");
  }
  const all = await listSources();
  const now = new Date().toISOString();
  const idx = all.findIndex((s) => s.line === input.line && s.year === input.year && s.month === input.month);
  let entry: SourceEntry;
  if (idx === -1) {
    entry = {
      id: `${input.line}-${input.year}-${input.month}-${Date.now()}`,
      line: input.line,
      year: input.year,
      month: input.month,
      spreadsheetId,
      url: input.url,
      createdAt: now,
    };
    all.push(entry);
  } else {
    entry = { ...all[idx], spreadsheetId, url: input.url };
    all[idx] = entry;
  }
  await saveAllSources(all);
  return entry;
}

export async function deleteSource(id: string): Promise<void> {
  const all = await listSources();
  await saveAllSources(all.filter((s) => s.id !== id));
}

export async function availableMonths(): Promise<Array<{ year: number; month: number; hasLine1: boolean; hasLine2: boolean }>> {
  const all = await listSources();
  const map = new Map<string, { year: number; month: number; hasLine1: boolean; hasLine2: boolean }>();
  for (const s of all) {
    const key = `${s.year}-${s.month}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { year: s.year, month: s.month, hasLine1: s.line === 1, hasLine2: s.line === 2 });
    } else {
      if (s.line === 1) existing.hasLine1 = true;
      else existing.hasLine2 = true;
    }
  }
  return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

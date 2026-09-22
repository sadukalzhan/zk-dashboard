// Видимость разделов дашборда (управляется из панели настроек).
// «Производство» — главная страница, скрыть его нельзя.

import { getRedis } from "./redis";

export type SectionVisibility = {
  finance: boolean;
  finishedProducts: boolean;
};

export const DEFAULT_SECTIONS: SectionVisibility = {
  finance: false,
  finishedProducts: true,
};

const KEY = "zk_dashboard:sections";

// Короткий кэш: после переключения другие экземпляры сервера увидят
// изменение не позже чем через SECTIONS_CACHE_TTL_MS.
let cache: { data: SectionVisibility; expiresAt: number } | null = null;
const SECTIONS_CACHE_TTL_MS = 10 * 1000;

export async function getSections(): Promise<SectionVisibility> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  let data = DEFAULT_SECTIONS;
  const redis = getRedis();
  if (redis) {
    try {
      const stored = await redis.get<Partial<SectionVisibility>>(KEY);
      data = { ...DEFAULT_SECTIONS, ...stored };
    } catch (e: unknown) {
      console.error("Upstash недоступен, использую видимость разделов по умолчанию:", e instanceof Error ? e.message : e);
    }
  }
  cache = { data, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS };
  return data;
}

export async function saveSections(sections: SectionVisibility): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Хранилище (Upstash Redis) не подключено — сохранить настройки разделов негде.");
  }
  await redis.set(KEY, sections).catch(() => {
    throw new Error("Хранилище (Upstash Redis) недоступно — не удалось сохранить настройки разделов.");
  });
  cache = { data: sections, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS };
}

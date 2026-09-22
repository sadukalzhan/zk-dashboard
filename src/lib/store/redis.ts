import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

// Общий клиент Upstash Redis. null — если переменные окружения не заданы.
export function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  // retry: false — если Upstash недоступен, падаем сразу, а не ждём 5 повторов
  // с экспоненциальной задержкой (~12 c) перед фолбэком.
  redisClient = new Redis({ url, token, retry: false });
  return redisClient;
}

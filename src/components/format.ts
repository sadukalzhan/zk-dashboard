export function formatNumber(value: number | null | undefined, opts: { decimals?: number; suffix?: string } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const { decimals = 0, suffix } = opts;
  const formatted = value.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;
}

export function formatDelta(current: number | undefined, prev: number | undefined): { value: string; positive: boolean | null; pct: number | null } {
  if (current === undefined || prev === undefined || prev === 0) {
    return { value: "—", positive: null, pct: null };
  }
  const diff = current - prev;
  const pct = (diff / prev) * 100;
  const positive = diff > 0;
  const sign = positive ? "+" : "";
  return {
    value: `${sign}${pct.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`,
    positive,
    pct,
  };
}

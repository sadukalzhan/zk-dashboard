"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  year: number;
  monthIndex: number;
  availableYears: number[];
};

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export function FinanceHeader({ year, monthIndex, availableYears }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) next.set(k, v);
    router.push(`${pathname}?${next.toString()}`);
  };

  const onRefresh = () => {
    setRefreshError(null);
    startRefresh(async () => {
      try {
        const res = await fetch(`/api/finance?year=${year}&refresh=1`);
        if (!res.ok) throw new Error("Не удалось обновить");
        router.refresh();
      } catch (e: unknown) {
        setRefreshError(e instanceof Error ? e.message : "Ошибка обновления");
      }
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">ЗК</div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight text-slate-900">ЗК-Дашборд</div>
            <div className="text-[11px] leading-tight text-slate-500">ТОО Зерде-Керамика Актобе</div>
          </div>
        </Link>

        <nav className="ml-2 flex rounded-lg bg-slate-100 p-0.5">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:text-slate-900"
          >
            Производство
          </Link>
          <Link
            href={`/finance?${params.toString()}`}
            className="rounded-md bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            Финансы
          </Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={String(year)}
            onChange={(e) => updateParams({ year: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            {availableYears.length === 0 ? (
              <option value={String(year)}>{year}</option>
            ) : (
              availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))
            )}
          </select>

          <select
            value={String(monthIndex)}
            onChange={(e) => updateParams({ monthIndex: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            title="Месяц для KPI"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50 disabled:opacity-50"
            title="Обновить данные из Google Sheets"
          >
            {isRefreshing ? "Обновление…" : "↻ Обновить"}
          </button>

          <Link
            href="/settings"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
          >
            Настройки
          </Link>
        </div>
      </div>
      {refreshError && (
        <div className="mx-auto max-w-screen-2xl px-4 pb-2 text-xs text-rose-600 sm:px-6">{refreshError}</div>
      )}
    </header>
  );
}

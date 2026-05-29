"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { BarChart3, Factory, RefreshCw, Settings } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-[#dcdde3] bg-[#eef2f6]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#192537] text-sm font-bold text-white shadow-[0_12px_28px_rgba(25,37,55,0.22)]">ЗК</div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight text-[#192537]">ЗК-Дашборд</div>
            <div className="text-[11px] leading-tight text-[#6f8aac]">ТОО Зерде-Керамика Актобе</div>
          </div>
        </Link>

        <nav className="ml-2 flex rounded-lg border border-[#dcdde3] bg-white p-1 shadow-sm">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[#4b6b95] transition hover:text-[#192537]"
          >
            <Factory className="h-4 w-4" />
            Производство
          </Link>
          <Link
            href={`/finance?${params.toString()}`}
            className="flex items-center gap-2 rounded-md bg-[#192537] px-3 py-1.5 text-sm text-white shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Финансы
          </Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={String(year)}
            onChange={(e) => updateParams({ year: e.target.value })}
            className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none"
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
            className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none"
            title="Месяц для KPI"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm hover:bg-[#f4f7fb] disabled:opacity-50"
            title="Обновить данные из Google Sheets"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Обновление…" : "Обновить"}
          </button>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-[#ee5c25] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(238,92,37,0.25)] hover:bg-[#d84f1d]"
          >
            <Settings className="h-4 w-4" />
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

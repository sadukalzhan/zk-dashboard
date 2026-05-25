"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LINE_LABELS, MONTH_NAMES_RU } from "@/lib/line-mapping";
import { useState, useTransition } from "react";

type Props = {
  line: 1 | 2;
  year: number;
  month: number;
  compare: boolean;
  availableMonths: Array<{ year: number; month: number; hasLine1: boolean; hasLine2: boolean }>;
};

export function Header({ line, year, month, compare, availableMonths }: Props) {
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
        const res = await fetch("/api/refresh", { method: "POST" });
        if (!res.ok) throw new Error("Не удалось обновить кэш");
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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Compare toggle */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => updateParams({ compare: "0" })}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                !compare ? "bg-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Одна линия
            </button>
            <button
              onClick={() => updateParams({ compare: "1" })}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                compare ? "bg-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Сравнение
            </button>
          </div>

          {/* Line picker (only when not comparing) */}
          {!compare && (
            <select
              value={String(line)}
              onChange={(e) => updateParams({ line: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="1">{LINE_LABELS[1].long}</option>
              <option value="2">{LINE_LABELS[2].long}</option>
            </select>
          )}

          {/* Month picker */}
          <select
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-");
              updateParams({ year: y, month: m });
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            {availableMonths.length === 0 ? (
              <option value={`${year}-${month}`}>
                {MONTH_NAMES_RU[month - 1]} {year}
              </option>
            ) : (
              availableMonths.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {MONTH_NAMES_RU[m.month - 1]} {m.year}
                  {!m.hasLine1 ? " (нет Л1)" : ""}
                  {!m.hasLine2 ? " (нет Л2)" : ""}
                </option>
              ))
            )}
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
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-700">
          {refreshError}
        </div>
      )}
    </header>
  );
}

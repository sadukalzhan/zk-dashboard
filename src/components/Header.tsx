"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LINE_LABELS, MONTH_NAMES_RU } from "@/lib/line-mapping";
import { useState, useTransition } from "react";
import { BarChart3, Factory, Package, RefreshCw, Settings } from "lucide-react";

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
            href={`/?${params.toString()}`}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              pathname === "/" ? "bg-[#192537] text-white shadow-sm" : "text-[#4b6b95] hover:text-[#192537]"
            }`}
          >
            <Factory className="h-4 w-4" />
            Производство
          </Link>
          <Link
            href="/finance"
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              pathname === "/finance" ? "bg-[#192537] text-white shadow-sm" : "text-[#4b6b95] hover:text-[#192537]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Финансы
          </Link>
          <Link
            href="/finished-products"
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              pathname === "/finished-products" ? "bg-[#192537] text-white shadow-sm" : "text-[#4b6b95] hover:text-[#192537]"
            }`}
          >
            <Package className="h-4 w-4" />
            Готовые продукции
          </Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Compare toggle */}
          <div className="flex rounded-lg border border-[#dcdde3] bg-white p-1 shadow-sm">
            <button
              onClick={() => updateParams({ compare: "0" })}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                !compare ? "bg-[#eef2f6] text-[#192537]" : "text-[#4b6b95] hover:text-[#192537]"
              }`}
            >
              Одна линия
            </button>
            <button
              onClick={() => updateParams({ compare: "1" })}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                compare ? "bg-[#eef2f6] text-[#192537]" : "text-[#4b6b95] hover:text-[#192537]"
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
              className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none"
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
            className="rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm focus:border-[#4b6b95] focus:outline-none"
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
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-700">
          {refreshError}
        </div>
      )}
    </header>
  );
}

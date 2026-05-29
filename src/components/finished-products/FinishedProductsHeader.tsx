"use client";

import Link from "next/link";
import { BarChart3, Factory, Package, RefreshCw, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function FinishedProductsHeader() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const onRefresh = () => {
    setRefreshError(null);
    startRefresh(async () => {
      try {
        const res = await fetch("/api/finished-products?refresh=1");
        if (!res.ok) throw new Error("Не удалось обновить данные");
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
          <Link href="/" className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[#4b6b95] transition hover:text-[#192537]">
            <Factory className="h-4 w-4" />
            Производство
          </Link>
          <Link href="/finance" className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[#4b6b95] transition hover:text-[#192537]">
            <BarChart3 className="h-4 w-4" />
            Финансы
          </Link>
          <Link href="/finished-products" className="flex items-center gap-2 rounded-md bg-[#192537] px-3 py-1.5 text-sm text-white shadow-sm">
            <Package className="h-4 w-4" />
            Готовые продукции
          </Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm hover:bg-[#f4f7fb] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Обновление…" : "Обновить"}
          </button>
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-lg bg-[#ee5c25] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(238,92,37,0.25)] hover:bg-[#d84f1d]">
            <Settings className="h-4 w-4" />
            Настройки
          </Link>
        </div>
      </div>
      {refreshError && (
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-700">{refreshError}</div>
      )}
    </header>
  );
}

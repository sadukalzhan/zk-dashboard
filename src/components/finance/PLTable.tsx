"use client";

import { useState } from "react";
import type { FinanceData } from "@/lib/types";
import { Card } from "../Card";

const MONTH_NAMES_SHORT = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function fmt(v: number): string {
  if (!v) return "—";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

export function PLTable({ data }: { data: FinanceData }) {
  const pl = data.pl;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!pl) {
    return (
      <Card title="Блок 3 · Детальный ОПиУ">
        <div className="text-sm text-slate-500">Нет данных по ОПиУ.</div>
      </Card>
    );
  }

  return (
    <Card title="Блок 3 · Отчёт о прибылях и убытках (ОПиУ)">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2 text-left font-medium">Статья</th>
              {MONTH_NAMES_SHORT.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-medium">{m}</th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-slate-700">ИТОГО</th>
            </tr>
          </thead>
          <tbody>
            {pl.sections.map((section, sIdx) => {
              const isOpen = expanded[section.title] ?? false;
              return (
                <>
                  <tr
                    key={`sec-${sIdx}`}
                    className="cursor-pointer bg-slate-100 font-semibold text-slate-800 hover:bg-slate-200"
                    onClick={() => setExpanded((x) => ({ ...x, [section.title]: !isOpen }))}
                  >
                    <td className="px-2 py-1.5 text-left">
                      <span className="mr-1 inline-block w-3 text-slate-500">{isOpen ? "▼" : "▶"}</span>
                      {section.title}
                    </td>
                    {section.totals.map((v, i) => (
                      <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
                    ))}
                    <td className="px-2 py-1.5 text-right">{fmt(section.totalYear)}</td>
                  </tr>
                  {isOpen && section.rows.map((row, rIdx) => (
                    <tr key={`row-${sIdx}-${rIdx}`} className="text-slate-700 hover:bg-slate-50">
                      <td className="px-2 py-1 pl-7 text-left">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-2 py-1 text-right">{fmt(v)}</td>
                      ))}
                      <td className="px-2 py-1 text-right">{fmt(row.total)}</td>
                    </tr>
                  ))}
                </>
              );
            })}
            {pl.stars.map((star, idx) => {
              const isFinal = star.label.startsWith("★★");
              return (
                <tr
                  key={`star-${idx}`}
                  className={isFinal ? "border-t-2 border-slate-300 bg-blue-50 font-bold text-blue-900" : "bg-slate-50 font-semibold text-slate-800"}
                >
                  <td className="px-2 py-1.5 text-left">{star.label}</td>
                  {star.values.map((v, i) => (
                    <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right">{fmt(star.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-slate-500">Кликните по разделу, чтобы развернуть строки.</div>
    </Card>
  );
}

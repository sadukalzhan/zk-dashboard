"use client";

import { useState } from "react";
import type { FinanceData, FinanceSection } from "@/lib/types";
import { Card } from "../Card";

const MONTH_NAMES_SHORT = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function fmt(v: number): string {
  if (!v) return "—";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function sum(arr: number[]): number {
  return arr.reduce((s, x) => s + (x || 0), 0);
}

export function CashFlowTable({ data }: { data: FinanceData }) {
  const cf = data.cashFlow;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!cf) {
    return (
      <Card title="Блок 4 · Отчёт о движении денежных средств (ДДС)">
        <div className="text-sm text-slate-500">Нет данных по ДДС.</div>
      </Card>
    );
  }

  const renderSection = (section: FinanceSection, key: string, accent: "in" | "out") => {
    const isOpen = expanded[key] ?? false;
    const accentBg = accent === "in" ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900";
    return (
      <>
        <tr
          key={`sec-${key}`}
          className={`cursor-pointer ${accentBg} font-semibold hover:opacity-80`}
          onClick={() => setExpanded((x) => ({ ...x, [key]: !isOpen }))}
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
          <tr key={`row-${key}-${rIdx}`} className="text-[#192537] hover:bg-[#f4f7fb]">
            <td className="px-2 py-1 pl-7 text-left">{row.label}</td>
            {row.values.map((v, i) => (
              <td key={i} className="px-2 py-1 text-right">{fmt(v)}</td>
            ))}
            <td className="px-2 py-1 text-right">{fmt(row.total)}</td>
          </tr>
        ))}
      </>
    );
  };

  const yearIn = sum(cf.totalInflows);
  const yearOut = sum(cf.totalOutflows);
  const yearNet = yearIn - yearOut;

  return (
    <Card title="Блок 4 · Движение денежных средств (ДДС)">
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Поступления за год" value={fmt(yearIn)} accent="emerald" />
        <Tile label="Выплаты за год" value={fmt(yearOut)} accent="rose" />
        <Tile label="Чистый денежный поток" value={fmt(yearNet)} accent={yearNet >= 0 ? "emerald" : "rose"} />
        <Tile label="Остаток на конец (Дек)" value={fmt(cf.endingBalance[11] || cf.endingBalance.find((v) => v) || 0)} accent="blue" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-[#dcdde3] text-[#6f8aac]">
              <th className="px-2 py-2 text-left font-medium">Статья</th>
              {MONTH_NAMES_SHORT.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-medium">{m}</th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-[#192537]">ИТОГО</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#f4f7fb] font-semibold text-[#192537]">
              <td className="px-2 py-1.5 text-left">Остаток на начало периода</td>
              {cf.beginningBalance.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
              ))}
              <td className="px-2 py-1.5 text-right">—</td>
            </tr>
            <tr><td colSpan={14} className="bg-emerald-100 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">ПОСТУПЛЕНИЯ</td></tr>
            {cf.inflowsBySection.map((s, i) => renderSection(s, `in-${i}`, "in"))}
            <tr className="bg-emerald-50 font-bold text-emerald-900">
              <td className="px-2 py-1.5 text-left">★ ИТОГО ПОСТУПЛЕНИЙ</td>
              {cf.totalInflows.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
              ))}
              <td className="px-2 py-1.5 text-right">{fmt(yearIn)}</td>
            </tr>
            <tr><td colSpan={14} className="bg-rose-100 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-900">ВЫПЛАТЫ</td></tr>
            {cf.outflowsBySection.map((s, i) => renderSection(s, `out-${i}`, "out"))}
            <tr className="bg-rose-50 font-bold text-rose-900">
              <td className="px-2 py-1.5 text-left">★ ИТОГО ВЫПЛАТ</td>
              {cf.totalOutflows.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
              ))}
              <td className="px-2 py-1.5 text-right">{fmt(yearOut)}</td>
            </tr>
            <tr className="border-t-2 border-[#dcdde3] bg-[#f4f7fb] font-bold text-[#192537]">
              <td className="px-2 py-1.5 text-left">Чистый денежный поток</td>
              {cf.netCashFlow.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
              ))}
              <td className="px-2 py-1.5 text-right">{fmt(yearNet)}</td>
            </tr>
            <tr className="bg-[#f4f7fb] font-bold text-[#192537]">
              <td className="px-2 py-1.5 text-left">Остаток на конец периода</td>
              {cf.endingBalance.map((v, i) => (
                <td key={i} className="px-2 py-1.5 text-right">{fmt(v)}</td>
              ))}
              <td className="px-2 py-1.5 text-right">—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-slate-500">Кликните по разделу, чтобы развернуть строки.</div>
    </Card>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: "emerald" | "rose" | "blue" }) {
  const cls = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-900",
    rose: "border-rose-100 bg-rose-50 text-rose-900",
    blue: "border-[#dcdde3] bg-[#f4f7fb] text-[#192537]",
  }[accent];
  return (
    <div className={`rounded-lg border ${cls} p-3 shadow-[0_12px_28px_rgba(25,37,55,0.05)]`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value} ₸</div>
    </div>
  );
}

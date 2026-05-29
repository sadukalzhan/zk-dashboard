"use client";

import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/Card";
import type { FinishedProductsDashboard } from "@/lib/types";
import { KpiCard } from "./KpiCard";

const COLORS = ["#192537", "#ee5c25", "#4b6b95", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export function SalesDashboard({ data }: { data: FinishedProductsDashboard }) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Общий объём продаж" value={formatThousandM2(data.kpis.totalSales)} sub="Structured Data · sale" accent="orange" />
        <KpiCard label="Общий объём производства" value={formatThousandM2(data.kpis.totalMade)} sub="Structured Data · made" />
        <KpiCard label="Лидирующий бренд" value={data.kpis.leadingBrand} sub="По сумме продаж" accent="green" />
        <KpiCard label="Топ дизайн" value={data.kpis.topDesign} sub="По сумме продаж" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Продажи по месяцам">
          <ChartBox>
            <LineChart data={data.monthlySales} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e7ebf0" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
              <Tooltip formatter={(value) => formatM2(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="2023" stroke="#4b6b95" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="2024" stroke="#ee5c25" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="2025" stroke="#192537" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ChartBox>
        </Card>

        <Card title="Доля брендов">
          <ChartBox>
            <PieChart>
              <Pie data={data.brandShare} dataKey="sales" nameKey="brand" innerRadius={62} outerRadius={102} paddingAngle={2}>
                {data.brandShare.map((entry, index) => (
                  <Cell key={entry.brand} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatM2(Number(value))} />
            </PieChart>
          </ChartBox>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {data.brandShare.map((item, index) => (
              <div key={item.brand} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#192537]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  {item.brand}
                </span>
                <span className="font-medium text-[#6f8aac]">{item.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Формат 60x60 vs 120x60">
          <ChartBox>
            <BarChart data={data.formatSplit} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e7ebf0" strokeDasharray="3 3" />
              <XAxis dataKey="format" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
              <Tooltip formatter={(value) => formatM2(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales" name="Продажи" fill="#ee5c25" radius={[6, 6, 0, 0]} />
              <Bar dataKey="made" name="Производство" fill="#192537" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartBox>
        </Card>

        <Card title="Топ-10 дизайнов">
          <ChartBox>
            <BarChart layout="vertical" data={data.topDesigns} margin={{ top: 8, right: 18, left: 28, bottom: 0 }}>
              <CartesianGrid stroke="#e7ebf0" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={compact} />
              <YAxis type="category" dataKey="design" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatM2(Number(value))} />
              <Bar dataKey="sales" name="Продажи" fill="#4b6b95" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartBox>
        </Card>
      </div>

      <Card title="Годовая динамика">
        <ChartBox height={340}>
          <BarChart data={data.yearlyDynamics} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e7ebf0" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
            <Tooltip formatter={(value) => formatM2(Number(value))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="sales" name="Продажи" fill="#ee5c25" radius={[6, 6, 0, 0]} />
            <Bar dataKey="made" name="Производство" fill="#192537" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartBox>
      </Card>
    </section>
  );
}

function ChartBox({ children, height = 300 }: { children: ReactElement; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

function formatThousandM2(value: number): string {
  return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс. кв.м`;
}

function formatM2(value: number): string {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} кв.м`;
}

function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} тыс.`;
  return value.toLocaleString("ru-RU");
}

import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "navy" | "orange" | "green" | "red";
};

const ACCENT = {
  navy: "border-[#dcdde3] bg-[#f4f7fb]",
  orange: "border-[#f4c7a8] bg-[#fff4ed]",
  green: "border-emerald-100 bg-emerald-50",
  red: "border-rose-100 bg-rose-50",
};

export function KpiCard({ label, value, sub, accent = "navy" }: Props) {
  return (
    <div className={`rounded-lg border ${ACCENT[accent]} p-4 shadow-[0_12px_28px_rgba(25,37,55,0.05)]`}>
      <div className="text-xs font-semibold uppercase text-[#6f8aac]">{label}</div>
      <div className="mt-3 text-2xl font-semibold tabular-nums text-[#192537]">{value}</div>
      {sub && <div className="mt-2 text-xs text-[#6f8aac]">{sub}</div>}
    </div>
  );
}

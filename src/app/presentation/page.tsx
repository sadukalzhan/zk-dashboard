import type { Metadata } from "next";
import { PresentationDeck, type DeckLine } from "@/components/presentation/PresentationDeck";
import { LINE_LABELS, LINE_NUMBERS } from "@/lib/line-mapping";
import { getLineMonthData } from "@/lib/sheets/aggregator";
import { availableMonths } from "@/lib/store/sources";
import type { LineNumber } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Презентация — ЗК-Дашборд" };

type SearchParams = Promise<{ line?: string; year?: string; month?: string }>;

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

// Имя линии для названия файла.
const FILE_SLUGS: Record<LineNumber, string> = {
  1: "Линия-1-120x60",
  2: "Линия-2-60x60",
  3: "Линия-1-60x60",
};

export default async function PresentationPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const months = await availableMonths();
  const fallback = months[0] ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const year = Number(sp.year ?? fallback.year);
  const month = Math.min(12, Math.max(1, Number(sp.month ?? fallback.month) || 1));

  // line=all — одна презентация по всем линиям подряд (из режима «Сравнение»).
  const all = sp.line === "all";
  const requested = Number(sp.line ?? 1);
  const single: LineNumber = LINE_NUMBERS.includes(requested as LineNumber) ? (requested as LineNumber) : 1;
  const ids: LineNumber[] = all ? LINE_NUMBERS : [single];

  const loaded = await Promise.all(
    ids.map(
      async (id): Promise<DeckLine> => ({
        id,
        short: LINE_LABELS[id].short,
        long: LINE_LABELS[id].long,
        data: await getLineMonthData(id, year, month),
      }),
    ),
  );
  // Линии без источника за этот месяц в презентацию не попадают.
  const lines = loaded.filter((l) => l.data.source);

  const mm = String(month).padStart(2, "0");
  const fileName = `ЗК-отчёт_${all ? "все-линии" : FILE_SLUGS[single]}_${year}-${mm}.pdf`;
  const backHref = all ? `/?compare=1&year=${year}&month=${month}` : `/?line=${single}&year=${year}&month=${month}`;
  const generatedAt = new Date().toLocaleDateString("ru-RU", { timeZone: "Asia/Aqtobe" });

  return (
    <PresentationDeck
      lines={lines}
      year={year}
      month={month}
      monthName={MONTH_NAMES[month - 1]}
      generatedAt={generatedAt}
      backHref={backHref}
      fileName={fileName}
    />
  );
}

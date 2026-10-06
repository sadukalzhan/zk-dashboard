"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { LineMonthData, LineNumber } from "@/lib/types";
import {
  AreaSlide,
  DowntimeAreasSlide,
  HeatmapSlide,
  KpiSlide,
  ParametersSlide,
  PRESENTATION_AREAS,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  TitleSlide,
  TopReasonsSlide,
  TrendSlide,
  type SlideMeta,
} from "./slides";

export type DeckLine = { id: LineNumber; short: string; long: string; data: LineMonthData };

type Props = {
  lines: DeckLine[];
  year: number;
  month: number;
  monthName: string;
  generatedAt: string;
  backHref: string;
  fileName: string;
};

// Печать: страница PDF = один слайд 16:9, без полей и без панели управления.
const PRINT_CSS = `
@media print {
  @page { size: ${SLIDE_WIDTH}px ${SLIDE_HEIGHT}px; margin: 0; }
  html, body { background: #ffffff !important; }
  .deck-no-print { display: none !important; }
  .deck-list { display: block !important; padding: 0 !important; }
  .deck-frame {
    width: ${SLIDE_WIDTH}px !important;
    height: ${SLIDE_HEIGHT}px !important;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    break-after: page;
    break-inside: avoid;
  }
  /* Без разрыва после последнего слайда, иначе в конце появляется пустая страница. */
  .deck-frame:last-child { break-after: auto; }
  html, body { height: auto !important; min-height: 0 !important; }
  .deck-scaler { transform: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

type Status = { kind: "idle" } | { kind: "busy"; done: number } | { kind: "done" } | { kind: "error"; text: string };

function subscribeToResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function fitScale(): number {
  return Math.min(1, (window.innerWidth - 32) / SLIDE_WIDTH);
}

export function PresentationDeck({ lines, year, month, monthName, generatedAt, backHref, fileName }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Слайд всегда свёрстан в 1280×720, на узком экране уменьшаем его целиком.
  const scale = useSyncExternalStore(subscribeToResize, fitScale, () => 1);

  const period = `${monthName} ${year}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  const builders: Array<(meta: SlideMeta) => ReactNode> = [];
  for (const line of lines) {
    const eyebrow = `${line.short} · ${period}`;
    const withMeta = (render: (meta: SlideMeta) => ReactNode) => (meta: SlideMeta) => render({ ...meta, eyebrow });

    builders.push(() => <TitleSlide lineLabel={line.long} period={period} generatedAt={generatedAt} />);
    builders.push(withMeta((meta) => <KpiSlide meta={meta} data={line.data} />));
    builders.push(withMeta((meta) => <TrendSlide meta={meta} data={line.data} month={month} />));
    builders.push(withMeta((meta) => <DowntimeAreasSlide meta={meta} data={line.data} />));
    builders.push(withMeta((meta) => <TopReasonsSlide meta={meta} data={line.data} />));
    for (const { area, label } of PRESENTATION_AREAS) {
      const downtime = line.data.downtime[area];
      if (downtime) builders.push(withMeta((meta) => <AreaSlide meta={meta} label={label} downtime={downtime} />));
    }
    builders.push(withMeta((meta) => <HeatmapSlide meta={meta} data={line.data} daysInMonth={daysInMonth} />));
    builders.push(withMeta((meta) => <ParametersSlide meta={meta} data={line.data} />));
  }
  const total = builders.length;

  const onDownload = async () => {
    const nodes = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-slide]") ?? []);
    if (!nodes.length) return;
    setStatus({ kind: "busy", done: 0 });
    try {
      const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      await document.fonts.ready;
      // Шрифты встраиваем один раз и переиспользуем для всех слайдов.
      const fontEmbedCSS = await getFontEmbedCSS(nodes[0]);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [SLIDE_WIDTH, SLIDE_HEIGHT],
        hotfixes: ["px_scaling"],
        compress: true,
      });
      for (let i = 0; i < nodes.length; i++) {
        const image = await toJpeg(nodes[i], {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          pixelRatio: 2,
          quality: 0.92,
          backgroundColor: "#ffffff",
          fontEmbedCSS,
        });
        if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "landscape");
        pdf.addImage(image, "JPEG", 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, undefined, "FAST");
        setStatus({ kind: "busy", done: i + 1 });
      }
      pdf.save(fileName);
      setStatus({ kind: "done" });
    } catch (e: unknown) {
      console.error("Не удалось собрать PDF:", e);
      setStatus({
        kind: "error",
        text: "Не удалось собрать PDF. Нажмите «Печать» и выберите «Сохранить как PDF».",
      });
    }
  };

  const busy = status.kind === "busy";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <header className="deck-no-print sticky top-0 z-40 border-b border-[#dcdde3] bg-[#eef2f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1312px] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm hover:bg-[#f4f7fb]"
          >
            <ArrowLeft className="h-4 w-4" />
            К дашборду
          </Link>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#192537]">Презентация · {period}</div>
            <div className="truncate text-xs text-[#6f8aac]">
              {lines.map((l) => l.short).join(", ")} · слайдов: {total}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6f8aac]" role="status">
              {status.kind === "busy" && `Готовлю слайды: ${status.done} из ${total}…`}
              {status.kind === "done" && "PDF сохранён"}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-[#dcdde3] bg-white px-3 py-2 text-sm text-[#192537] shadow-sm hover:bg-[#f4f7fb] disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Печать
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={busy || total === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ee5c25] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(238,92,37,0.25)] hover:bg-[#d84f1d] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {busy ? "Готовлю…" : "Скачать PDF"}
            </button>
          </div>
        </div>
        {status.kind === "error" && (
          <div className="border-t border-rose-200 bg-rose-50 px-4 py-1.5 text-center text-xs text-rose-700">{status.text}</div>
        )}
      </header>

      <main>
        {total === 0 ? (
          <p className="deck-no-print px-4 py-16 text-center text-sm text-[#6f8aac]">
            За {period} нет подключённых источников данных — показать нечего.
          </p>
        ) : (
          <div ref={listRef} className="deck-list flex flex-col items-center gap-6 px-4 py-6">
            {builders.map((build, index) => (
              <div
                key={index}
                className="deck-frame overflow-hidden rounded-lg shadow-[0_18px_45px_rgba(25,37,55,0.12)]"
                style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }}
              >
                <div className="deck-scaler origin-top-left" style={{ transform: `scale(${scale})` }}>
                  {build({ eyebrow: "", page: index + 1, total })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

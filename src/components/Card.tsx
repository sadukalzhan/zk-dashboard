import { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
  rightSlot,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || rightSlot) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-700">{title}</h2>}
          {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

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
    <section className={`rounded-lg border border-[#dcdde3] bg-white shadow-[0_18px_45px_rgba(25,37,55,0.07)] ${className}`}>
      {(title || rightSlot) && (
        <header className="flex items-center justify-between gap-3 border-b border-[#e7ebf0] px-5 py-4">
          {title && <h2 className="text-sm font-semibold text-[#192537]">{title}</h2>}
          {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

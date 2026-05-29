"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
        <h1 className="text-lg font-semibold">Не удалось загрузить «Готовые продукции»</h1>
        <p className="mt-2 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-[#ee5c25] px-4 py-2 text-sm font-medium text-white hover:bg-[#d84f1d]"
        >
          Повторить
        </button>
      </div>
    </main>
  );
}

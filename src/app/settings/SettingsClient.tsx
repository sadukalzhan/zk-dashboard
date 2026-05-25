"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LineNumber, SourceEntry } from "@/lib/types";
import { LINE_LABELS, MONTH_NAMES_RU } from "@/lib/line-mapping";

type Props = {
  initialAuthed: boolean;
  initialSources: SourceEntry[];
};

export function SettingsClient({ initialAuthed, initialSources }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState(initialAuthed);
  const [sources, setSources] = useState<SourceEntry[]>(initialSources);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoginBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Ошибка входа");
      setAuthed(true);
      setPassword("");
      const r = await fetch("/api/sources");
      const j2 = await r.json();
      setSources(j2.sources ?? []);
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoginBusy(false);
    }
  };

  const onLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthed(false);
    router.refresh();
  };

  if (!authed) {
    return (
      <form onSubmit={onLogin} className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Войти в панель администратора</h2>
        <p className="text-sm text-slate-500">
          Введите пароль, заданный в переменной окружения <code className="rounded bg-slate-100 px-1">ADMIN_PASSWORD</code>.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Пароль"
        />
        {authError && <div className="text-sm text-rose-600">{authError}</div>}
        <button
          type="submit"
          disabled={loginBusy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loginBusy ? "Вход…" : "Войти"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <SourceForm
        onSubmitted={(s) => {
          setSources((prev) => {
            const next = prev.filter((x) => !(x.line === s.line && x.year === s.year && x.month === s.month));
            return [...next, s].sort((a, b) => b.year - a.year || b.month - a.month || a.line - b.line);
          });
        }}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Подключённые источники</h2>
          <button onClick={onLogout} className="text-sm text-slate-500 hover:text-rose-600">Выйти</button>
        </header>
        {sources.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Пока ничего не добавлено.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sources
              .slice()
              .sort((a, b) => b.year - a.year || b.month - a.month || a.line - b.line)
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {LINE_LABELS[s.line as LineNumber].short} · {MONTH_NAMES_RU[s.month - 1]} {s.year}
                    </div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      {s.url}
                    </a>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("Удалить этот источник?")) return;
                      const res = await fetch(`/api/sources?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
                      if (res.ok) {
                        setSources((prev) => prev.filter((x) => x.id !== s.id));
                      }
                    }}
                    className="text-sm text-rose-600 hover:underline"
                  >
                    Удалить
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-700">
        <h3 className="mb-1 font-semibold text-blue-900">Как сделать Google Sheets доступным:</h3>
        <ol className="ml-5 list-decimal space-y-1 text-xs">
          <li>Откройте таблицу → правый верхний угол → <em>Поделиться</em>.</li>
          <li>Раздел <em>«Общий доступ»</em> → выберите <em>«Все, у кого есть ссылка»</em>, роль <em>«Читатель»</em>.</li>
          <li>Скопируйте ссылку и вставьте её в форму выше.</li>
          <li>Дашборд проверит формат и сохранит ссылку.</li>
        </ol>
      </div>
    </div>
  );
}

function SourceForm({ onSubmitted }: { onSubmitted: (s: SourceEntry) => void }) {
  const now = new Date();
  const [line, setLine] = useState<LineNumber>(1);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ line, year, month, url }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Ошибка");
      onSubmitted(j.entry as SourceEntry);
      setSuccess(`Сохранено: ${LINE_LABELS[line].short}, ${MONTH_NAMES_RU[month - 1]} ${year}`);
      setUrl("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Добавить / обновить источник</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Линия</span>
          <select
            value={line}
            onChange={(e) => setLine(Number(e.target.value) as LineNumber)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={1}>Линия 1 (ЗК-120/60)</option>
            <option value={2}>Линия 2 (ЗК-60/60)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Год</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Месяц</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {MONTH_NAMES_RU.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <div className="hidden sm:block" />
        <label className="block sm:col-span-4">
          <span className="mb-1 block text-xs font-medium text-slate-600">Ссылка на Google Sheets</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </label>
      </div>
      {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
      {success && <div className="mt-3 text-sm text-emerald-600">{success}</div>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

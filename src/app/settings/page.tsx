import Link from "next/link";
import { SettingsClient } from "./SettingsClient";
import { isAuthed } from "@/lib/auth";
import { listFinanceSources, listSources } from "@/lib/store/sources";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authed = await isAuthed();
  const sources = authed ? await listSources() : [];
  const financeSources = authed ? await listFinanceSources() : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Панель настроек</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← На дашборд</Link>
      </div>
      <SettingsClient
        initialAuthed={authed}
        initialSources={sources}
        initialFinanceSources={financeSources}
      />
    </main>
  );
}

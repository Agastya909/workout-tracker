"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

type Split = { id: string; name: string; created_at: string };

export default function SplitsPage() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await apiFetch<Split[]>("/splits");
      setSplits(data ?? []);
    } catch (e) {
      console.error("splits load error:", e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addSplit() {
    if (!name.trim()) return;
    setAdding(true);
    await apiFetch("/splits", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
    setName("");
    await load();
    setAdding(false);
  }

  async function deleteSplit(id: string) {
    await apiFetch(`/splits/${id}`, { method: "DELETE" });
    setSplits((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <Link href="/" className={`text-sm ${colors.text.secondary} ${colors.interactive.base}`}>← Back</Link>
        <span className="text-base font-semibold tracking-tight">Splits</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className={`flex gap-2`}>
          <input
            className={`flex-1 px-4 py-2.5 rounded-xl ${colors.bg.elevated} border ${colors.border.default} text-sm ${colors.text.primary} placeholder:${colors.text.muted} focus:outline-none focus:${colors.border.focus}`}
            placeholder="New split name (e.g. Push Pull Legs)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSplit()}
          />
          <button
            onClick={addSplit}
            disabled={adding || !name.trim()}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm ${colors.accent.primary} disabled:opacity-40`}
          >
            Add
          </button>
        </div>

        {loading && <p className={`text-sm ${colors.text.muted} text-center py-12`}>Loading...</p>}

        {!loading && splits.length === 0 && (
          <p className={`text-sm ${colors.text.muted} text-center py-12`}>No splits yet. Create one above.</p>
        )}

        <div className="space-y-2">
          {splits.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl ${colors.bg.elevated} border ${colors.border.default}`}
            >
              <span className="text-sm font-medium">{s.name}</span>
              <button
                onClick={() => deleteSplit(s.id)}
                className={`text-xs px-3 py-1.5 rounded-lg ${colors.accent.red.button} font-medium ${colors.interactive.base}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

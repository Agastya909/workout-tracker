"use client";

import { useEffect, useState } from "react";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

type Routine = { id: string; name: string; description: string; created_at: string };

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<Routine[]>("/routines");
      setRoutines(data ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await apiFetch<{ id: string }>("/routines", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      window.location.href = `/routines/${res.id}`;
    } catch {
      setAdding(false);
    }
  }

  async function deleteRoutine(id: string) {
    try {
      await apiFetch(`/routines/${id}`, { method: "DELETE" });
      setRoutines((r) => r.filter((x) => x.id !== id));
    } catch {}
  }

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/" className={`text-sm ${colors.text.secondary} ${colors.interactive.base}`}>← Back</a>
        <span className="text-base font-semibold tracking-tight">Routines</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`text-sm font-semibold ${colors.text.primary} ${colors.interactive.base}`}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <div className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl p-4 space-y-3`}>
            <input
              autoFocus
              placeholder="Routine name (e.g. Push Day)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              className={`w-full px-3 py-2.5 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm ${colors.text.primary} placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500`}
            />
            <input
              placeholder="Description (optional)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm ${colors.text.primary} placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500`}
            />
            <button
              onClick={create}
              disabled={adding || !name.trim()}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm ${colors.accent.primary} disabled:opacity-40`}
            >
              {adding ? "Creating..." : "Create & Add Exercises"}
            </button>
          </div>
        )}

        {loading && <p className={`text-sm ${colors.text.muted} text-center py-12`}>Loading...</p>}

        {!loading && routines.length === 0 && !showForm && (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">📋</p>
            <p className={`text-sm ${colors.text.muted}`}>No routines yet. Create your first one!</p>
          </div>
        )}

        <div className="space-y-2">
          {routines.map((r) => (
            <div
              key={r.id}
              className={`flex items-center justify-between px-4 py-4 rounded-2xl ${colors.bg.elevated} border ${colors.border.default}`}
            >
              <a href={`/routines/${r.id}`} className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{r.name}</p>
                {r.description && <p className={`text-xs ${colors.text.muted} mt-0.5 truncate`}>{r.description}</p>}
              </a>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <a
                  href={`/routines/${r.id}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${colors.border.default} ${colors.text.secondary} font-medium ${colors.interactive.base} ${colors.interactive.hover}`}
                >
                  Edit
                </a>
                <button
                  onClick={() => deleteRoutine(r.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg ${colors.accent.red.button} font-medium ${colors.interactive.base}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

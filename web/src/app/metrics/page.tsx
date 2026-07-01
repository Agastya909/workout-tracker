"use client";

import { useEffect, useState } from "react";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

type Metric = {
  id: string;
  date: string;
  weight_kg?: number;
  body_fat_pct?: number;
  notes: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await apiFetch<Metric[]>("/body-metrics");
    setMetrics(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    await apiFetch("/body-metrics", {
      method: "POST",
      body: JSON.stringify({
        date: new Date(date).toISOString(),
        weight_kg: weight ? parseFloat(weight) : undefined,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : undefined,
        notes,
      }),
    });
    setWeight(""); setBodyFat(""); setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function deleteMetric(id: string) {
    await apiFetch(`/body-metrics/${id}`, { method: "DELETE" });
    setMetrics((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/" className={`text-sm ${colors.text.secondary} ${colors.interactive.base}`}>← Back</a>
        <span className="text-base font-semibold tracking-tight">Body Metrics</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`text-sm font-semibold ${colors.text.primary} ${colors.interactive.base}`}
        >
          {showForm ? "Cancel" : "+ Log"}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <div className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl p-4 space-y-3`}>
            <p className="text-sm font-semibold">New Entry</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={`text-xs ${colors.text.muted} mb-1 block`}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm ${colors.text.primary} focus:outline-none`}
                />
              </div>
              <div>
                <label className={`text-xs ${colors.text.muted} mb-1 block`}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm ${colors.text.primary} focus:outline-none`}
                />
              </div>
              <div>
                <label className={`text-xs ${colors.text.muted} mb-1 block`}>Body Fat %</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="15.0"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm ${colors.text.primary} focus:outline-none`}
                />
              </div>
              <div className="col-span-2">
                <label className={`text-xs ${colors.text.muted} mb-1 block`}>Notes</label>
                <input
                  placeholder="Optional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm ${colors.text.primary} focus:outline-none`}
                />
              </div>
            </div>
            <button
              onClick={save}
              disabled={saving || (!weight && !bodyFat)}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm ${colors.accent.primary} disabled:opacity-40`}
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        )}

        {loading && <p className={`text-sm ${colors.text.muted} text-center py-12`}>Loading...</p>}

        {!loading && metrics.length === 0 && !showForm && (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">⚖️</p>
            <p className={`text-sm ${colors.text.muted}`}>No entries yet. Log your first measurement!</p>
          </div>
        )}

        <div className="space-y-2">
          {metrics.map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl ${colors.bg.elevated} border ${colors.border.default}`}
            >
              <div>
                <p className={`text-xs ${colors.text.muted}`}>{formatDate(m.date)}</p>
                <div className="flex gap-4 mt-1">
                  {m.weight_kg != null && (
                    <span className="text-sm font-semibold">{m.weight_kg} <span className={`text-xs font-normal ${colors.text.muted}`}>kg</span></span>
                  )}
                  {m.body_fat_pct != null && (
                    <span className={`text-sm ${colors.text.secondary}`}>{m.body_fat_pct}<span className={`text-xs ${colors.text.muted}`}>% bf</span></span>
                  )}
                </div>
                {m.notes && <p className={`text-xs ${colors.text.muted} mt-0.5`}>{m.notes}</p>}
              </div>
              <button
                onClick={() => deleteMetric(m.id)}
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

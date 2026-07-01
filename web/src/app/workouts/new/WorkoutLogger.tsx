"use client";

import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/app/exercises/page";

type Set = {
  exercise_id: string;
  exercise_name: string;
  reps: string;
  weight: string;
};

export default function WorkoutLogger({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sets, setSets] = useState<Set[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // exercise picker state
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(search.toLowerCase())
  );

  function addExercise(ex: Exercise) {
    setSets((prev) => [...prev, { exercise_id: ex.id, exercise_name: ex.name, reps: "", weight: "" }]);
    setShowPicker(false);
    setSearch("");
  }

  function updateSet(i: number, field: "reps" | "weight", val: string) {
    setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (sets.length === 0) { setError("Add at least one set."); return; }
    setSaving(true);
    setError(null);
    try {
      const { id } = await apiFetch<{ id: string }>("/workouts", {
        method: "POST",
        body: JSON.stringify({ name: name || "Workout", date: new Date().toISOString() }),
      });

      await Promise.all(
        sets.map((s, i) =>
          apiFetch(`/workouts/${id}/sets`, {
            method: "POST",
            body: JSON.stringify({
              exercise_id: s.exercise_id,
              set_number: i + 1,
              reps: s.reps ? parseInt(s.reps) : null,
              weight: s.weight ? parseFloat(s.weight) : null,
            }),
          })
        )
      );

      router.push("/workouts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save workout");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Workout name */}
      <input
        type="text"
        placeholder="Workout name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={`w-full rounded-xl ${colors.bg.elevated} border ${colors.border.strong} ${colors.text.primary} px-4 py-3 text-base placeholder-zinc-600 focus:outline-none focus:border-zinc-500`}
      />

      {error && (
        <p className={`text-sm ${colors.accent.red.text} ${colors.accent.red.bg} border ${colors.accent.red.border} rounded-lg px-4 py-3`}>
          {error}
        </p>
      )}

      {/* Sets */}
      {sets.length > 0 && (
        <div className="space-y-3">
          {sets.map((s, i) => (
            <div key={i} className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl px-4 py-3 space-y-3`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{s.exercise_name}</p>
                <button onClick={() => removeSet(i)} className={`text-xs ${colors.accent.red.text} ${colors.interactive.base}`}>
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs ${colors.text.muted} mb-1`}>Weight (kg)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={s.weight}
                    onChange={(e) => updateSet(i, "weight", e.target.value)}
                    className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-3 py-2 text-sm focus:outline-none focus:border-zinc-500`}
                  />
                </div>
                <div>
                  <label className={`block text-xs ${colors.text.muted} mb-1`}>Reps</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={s.reps}
                    onChange={(e) => updateSet(i, "reps", e.target.value)}
                    className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-3 py-2 text-sm focus:outline-none focus:border-zinc-500`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add exercise */}
      <button
        onClick={() => setShowPicker(true)}
        className={`w-full rounded-2xl border border-dashed ${colors.border.strong} ${colors.text.secondary} py-4 text-sm font-medium ${colors.interactive.base} ${colors.interactive.hover}`}
      >
        + Add Exercise
      </button>

      {/* Exercise picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className={`relative w-full max-w-sm ${colors.bg.elevated} border ${colors.border.default} rounded-2xl p-4 space-y-3 max-h-[70vh] flex flex-col`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Pick Exercise</h2>
              <button onClick={() => setShowPicker(false)} className={`${colors.text.muted} text-xl leading-none`}>×</button>
            </div>
            <input
              autoFocus
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-4 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500`}
            />
            <div className="overflow-y-auto flex-1 -mx-1">
              {filtered.length === 0 && (
                <p className={`text-sm ${colors.text.muted} text-center py-6`}>No results.</p>
              )}
              {filtered.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl ${colors.interactive.base} ${colors.interactive.hover} flex items-center justify-between`}
                >
                  <span className="text-sm font-medium">{ex.name}</span>
                  <span className={`text-xs ${colors.text.muted}`}>{ex.muscle_group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className={`fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 ${colors.bg.base} border-t ${colors.border.default}`}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full max-w-2xl mx-auto block rounded-xl ${colors.accent.primary} font-semibold py-3 text-base disabled:opacity-40`}
        >
          {saving ? "Saving..." : "Save Workout"}
        </button>
      </div>
    </div>
  );
}

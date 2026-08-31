"use client";

import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import type { Exercise } from "./page";

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Full Body", "Cardio"];
const TYPES = ["strength", "bodyweight", "cardio", "olympic"] as const;

export default function AddExerciseModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (e: Exercise) => void;
}) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0]);
  const [type, setType] = useState<typeof TYPES[number]>("strength");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: string }>("/exercises", {
        method: "POST",
        body: JSON.stringify({ name, muscle_group: muscleGroup, type }),
      });
      onAdded({ id: res.id, name, muscle_group: muscleGroup, type, is_global: false });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add exercise");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm ${colors.bg.elevated} border ${colors.border.default} rounded-2xl p-6 space-y-5`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">New Exercise</h2>
          <button onClick={onClose} className={`${colors.text.muted} hover:${colors.text.primary} text-xl leading-none`}>×</button>
        </div>

        {error && (
          <p className={`text-sm ${colors.accent.red.text} ${colors.accent.red.bg} border ${colors.accent.red.border} rounded-lg px-3 py-2`}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${colors.text.secondary} mb-1.5`}>Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Incline Dumbbell Press"
              className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-4 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${colors.text.secondary} mb-1.5`}>Muscle Group</label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500`}
            >
              {MUSCLE_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${colors.text.secondary} mb-1.5`}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl py-2 text-sm font-medium border ${colors.interactive.base} ${
                    type === t
                      ? `${colors.bg.overlay} ${colors.border.strong} ${colors.text.primary}`
                      : `${colors.bg.input} ${colors.border.default} ${colors.text.secondary}`
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl ${colors.accent.primary} font-semibold py-2.5 text-sm disabled:opacity-40`}
          >
            {loading ? "Adding..." : "Add Exercise"}
          </button>
        </form>
      </div>
    </div>
  );
}

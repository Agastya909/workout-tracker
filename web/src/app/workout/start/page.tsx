"use client";

import { useEffect, useState } from "react";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

type Routine = { id: string; name: string; description: string };

export default function StartWorkoutPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActive, setHasActive] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [rData, session] = await Promise.all([
          apiFetch<Routine[]>("/routines"),
          apiFetch<{ id: string } | null>("/sessions/active"),
        ]);
        setRoutines(rData ?? []);
        setHasActive(!!session);
      } catch {}
      setLoading(false);
    }
    init();
  }, []);

  async function start(routineId: string | null) {
    setStarting(routineId ?? "blank");
    try {
      // build initial state from routine if selected
      let initialState = {};
      if (routineId) {
        const routine = await apiFetch<{
          id: string;
          name: string;
          exercises: Array<{
            id: string;
            exercise_id: string;
            exercise_name: string;
            muscle_group: string;
            sets: Array<{ id: string; set_number: number; default_reps: number | null; default_weight: number | null }>;
          }>;
        }>(`/routines/${routineId}`);

        initialState = {
          routine_id: routineId,
          routine_name: routine.name,
          exercises: routine.exercises.map((ex) => ({
            routine_exercise_id: ex.id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            is_new: false,
            sets: ex.sets.map((s) => ({
              set_number: s.set_number,
              reps: s.default_reps,
              weight: s.default_weight,
              done: false,
            })),
          })),
        };
      }

      await apiFetch("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ routine_id: routineId, state: initialState }),
      });

      // persist to localStorage as well
      localStorage.setItem("workout_state", JSON.stringify(initialState));
      window.location.href = "/workout/active";
    } catch {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg.base} flex items-center justify-center`}>
        <p className={`text-sm ${colors.text.muted}`}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/" className={`text-sm ${colors.text.secondary} ${colors.interactive.base}`}>← Back</a>
        <span className="text-base font-semibold tracking-tight">Start Workout</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {hasActive && (
          <div className={`${colors.accent.orange.bg} border ${colors.accent.orange.border} rounded-2xl px-4 py-4 flex items-center justify-between`}>
            <div>
              <p className={`text-sm font-semibold ${colors.accent.orange.text}`}>Workout in progress</p>
              <p className={`text-xs ${colors.text.muted} mt-0.5`}>You have an unfinished workout.</p>
            </div>
            <a
              href="/workout/active"
              className={`text-sm font-semibold px-4 py-2 rounded-xl ${colors.accent.primary}`}
            >
              Resume
            </a>
          </div>
        )}

        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${colors.text.muted} mb-3`}>Quick Start</p>
          <button
            onClick={() => start(null)}
            disabled={!!starting}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-dashed ${colors.border.strong} ${colors.interactive.base} hover:border-zinc-500 disabled:opacity-40`}
          >
            <span className="text-2xl">➕</span>
            <div className="text-left">
              <p className="font-semibold text-sm">Blank Workout</p>
              <p className={`text-xs ${colors.text.muted}`}>Start fresh, add exercises on the go</p>
            </div>
          </button>
        </div>

        {routines.length > 0 && (
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest ${colors.text.muted} mb-3`}>Your Routines</p>
            <div className="space-y-2">
              {routines.map((r) => (
                <button
                  key={r.id}
                  onClick={() => start(r.id)}
                  disabled={!!starting}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl ${colors.bg.elevated} border ${colors.border.default} ${colors.interactive.base} ${colors.interactive.hover} ${colors.interactive.hoverBorder} disabled:opacity-40 text-left`}
                >
                  <div>
                    <p className="font-semibold text-sm">{r.name}</p>
                    {r.description && <p className={`text-xs ${colors.text.muted} mt-0.5`}>{r.description}</p>}
                  </div>
                  <span className={`text-sm ${colors.text.muted} shrink-0 ml-3`}>
                    {starting === r.id ? "Starting..." : "→"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {routines.length === 0 && (
          <p className={`text-sm ${colors.text.muted} text-center`}>
            No routines yet.{" "}
            <a href="/routines" className="text-white underline underline-offset-2">Create one</a>{" "}
            or start a blank workout.
          </p>
        )}
      </main>
    </div>
  );
}

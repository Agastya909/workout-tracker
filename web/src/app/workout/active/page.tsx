"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type ActiveSet = {
  set_number: number;
  reps: number | null;
  weight: number | null;
  done: boolean;
};

type ActiveExercise = {
  routine_exercise_id: string | null; // null = added on the fly
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  is_new: boolean; // added during this session (not in routine originally)
  sets: ActiveSet[];
};

type WorkoutState = {
  routine_id?: string;
  routine_name?: string;
  exercises: ActiveExercise[];
};

type LibraryExercise = { id: string; name: string; muscle_group: string };

// ── Helpers ────────────────────────────────────────────────────────────────

const LS_KEY = "workout_state";

function loadLocal(): WorkoutState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(state: WorkoutState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ActiveWorkoutPage() {
  const [state, setState] = useState<WorkoutState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExPicker, setShowExPicker] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [search, setSearch] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state: localStorage first (fast), then fall back to server
  useEffect(() => {
    async function init() {
      const local = loadLocal();
      if (local) {
        setState(local);
        setLoading(false);
        return;
      }
      try {
        const session = await apiFetch<{ state: WorkoutState } | null>("/sessions/active");
        if (session?.state && Object.keys(session.state).length > 0) {
          setState(session.state as WorkoutState);
          saveLocal(session.state as WorkoutState);
        }
      } catch {}
      setLoading(false);
    }
    init();
  }, []);

  // Background sync to server every 30s
  const syncToServer = useCallback(async (s: WorkoutState) => {
    try {
      await apiFetch("/sessions/active", {
        method: "PATCH",
        body: JSON.stringify({ state: s }),
      });
    } catch {}
  }, []);

  function update(updater: (prev: WorkoutState) => WorkoutState) {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveLocal(next);
      // debounce server sync
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => syncToServer(next), 30_000);
      return next;
    });
  }

  // Sync on tab hide
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden" && state) {
        syncToServer(state);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [state, syncToServer]);

  // ── Exercise actions ──

  async function openExPicker() {
    if (library.length === 0) {
      try {
        const data = await apiFetch<LibraryExercise[]>("/exercises");
        setLibrary(data ?? []);
      } catch {}
    }
    setShowExPicker(true);
  }

  function addExercise(ex: LibraryExercise) {
    update((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          routine_exercise_id: null,
          exercise_id: ex.id,
          exercise_name: ex.name,
          muscle_group: ex.muscle_group,
          is_new: true,
          sets: [{ set_number: 1, reps: null, weight: null, done: false }],
        },
      ],
    }));
    setShowExPicker(false);
    setSearch("");
  }

  function removeExercise(exIdx: number) {
    update((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exIdx),
    }));
  }

  // ── Set actions ──

  function addSet(exIdx: number) {
    update((prev) => {
      const exercises = [...prev.exercises];
      const ex = { ...exercises[exIdx] };
      ex.sets = [
        ...ex.sets,
        { set_number: ex.sets.length + 1, reps: null, weight: null, done: false },
      ];
      exercises[exIdx] = ex;
      return { ...prev, exercises };
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    update((prev) => {
      const exercises = [...prev.exercises];
      const ex = { ...exercises[exIdx] };
      ex.sets = ex.sets
        .filter((_, i) => i !== setIdx)
        .map((s, i) => ({ ...s, set_number: i + 1 }));
      exercises[exIdx] = ex;
      return { ...prev, exercises };
    });
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof ActiveSet, value: unknown) {
    update((prev) => {
      const exercises = prev.exercises.map((ex, ei) =>
        ei !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, [field]: value }
              ),
            }
      );
      return { ...prev, exercises };
    });
  }

  function toggleDone(exIdx: number, setIdx: number) {
    const set = state?.exercises[exIdx]?.sets[setIdx];
    if (!set) return;
    updateSet(exIdx, setIdx, "done", !set.done);
  }

  // ── Finish ──

  async function discard() {
    if (!confirm("Discard this workout? All data will be lost.")) return;
    localStorage.removeItem(LS_KEY);
    try { await apiFetch("/sessions/active", { method: "DELETE" }); } catch {}
    window.location.href = "/";
  }

  async function finish() {
    if (!state) return;
    setFinishing(true);

    // Collect only done sets
    const sets = state.exercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.done)
        .map((s) => ({
          exercise_id: ex.exercise_id,
          set_number: s.set_number,
          reps: s.reps,
          weight: s.weight,
          rpe: null,
          notes: "",
        }))
    );

    // Build routine update payload
    let routineUpdate = null;
    if (state.routine_id) {
      const newExercises = state.exercises
        .filter((ex) => ex.is_new)
        .map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets.map((s) => ({
            set_number: s.set_number,
            default_reps: s.reps,
            default_weight: s.weight,
          })),
        }));

      // detect set count changes on existing exercises
      const modifiedSets = state.exercises
        .filter((ex) => !ex.is_new && ex.routine_exercise_id)
        .map((ex) => ({
          routine_exercise_id: ex.routine_exercise_id!,
          new_set_count: ex.sets.length,
          sets_to_add: ex.sets.map((s) => ({
            set_number: s.set_number,
            default_reps: s.reps,
            default_weight: s.weight,
          })),
        }));

      if (newExercises.length > 0 || modifiedSets.some((m) => m.new_set_count !== m.sets_to_add.length)) {
        routineUpdate = { new_exercises: newExercises, modified_sets: modifiedSets };
      }
    }

    try {
      await apiFetch("/sessions/finish", {
        method: "POST",
        body: JSON.stringify({
          name: workoutName || state.routine_name || "Workout",
          notes: "",
          routine_id: state.routine_id ?? null,
          sets,
          routine_update: routineUpdate,
        }),
      });
      localStorage.removeItem(LS_KEY);
      window.location.href = "/workouts";
    } catch {
      setFinishing(false);
    }
  }

  const filteredLibrary = library.filter(
    (e) =>
      !state?.exercises.some((ex) => ex.exercise_id === e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase())
  );

  const doneSetsCount = state?.exercises.flatMap((e) => e.sets).filter((s) => s.done).length ?? 0;

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg.base} flex items-center justify-center`}>
        <p className={`text-sm ${colors.text.muted}`}>Loading workout...</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={`min-h-screen ${colors.bg.base} flex items-center justify-center flex-col gap-4`}>
        <p className={`text-sm ${colors.text.muted}`}>No active workout.</p>
        <a href="/workout/start" className={`px-6 py-2.5 rounded-xl font-semibold text-sm ${colors.accent.primary}`}>
          Start One
        </a>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary} pb-28`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <button
          onClick={discard}
          className={`text-sm ${colors.accent.red.text} ${colors.interactive.base}`}
        >
          Discard
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{state.routine_name ?? "Workout"}</p>
          <p className={`text-xs ${colors.text.muted}`}>{doneSetsCount} sets done</p>
        </div>
        <button
          onClick={() => setShowFinishModal(true)}
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${colors.accent.primary}`}
        >
          Finish
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {state.exercises.map((ex, exIdx) => (
          <div key={exIdx} className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${colors.border.default}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{ex.exercise_name}</p>
                  {ex.is_new && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${colors.accent.green.badge}`}>New</span>
                  )}
                </div>
                <p className={`text-xs ${colors.text.muted}`}>{ex.muscle_group}</p>
              </div>
              <button
                onClick={() => removeExercise(exIdx)}
                className={`text-xs ${colors.text.muted} hover:${colors.accent.red.text} ${colors.interactive.base}`}
              >
                ✕
              </button>
            </div>

            {/* Set rows */}
            <div className="divide-y divide-zinc-800/40">
              {ex.sets.map((s, setIdx) => (
                <div
                  key={setIdx}
                  className={`flex items-center gap-2 px-4 py-2.5 ${s.done ? "opacity-60" : ""}`}
                >
                  {/* Done toggle */}
                  <button
                    onClick={() => toggleDone(exIdx, setIdx)}
                    className={`w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center ${colors.interactive.base} ${
                      s.done
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : `border-zinc-600 ${colors.text.muted}`
                    }`}
                  >
                    {s.done && <span className="text-xs">✓</span>}
                  </button>

                  <span className={`text-xs ${colors.text.muted} w-8 shrink-0`}>{s.set_number}</span>

                  {/* Weight */}
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      onClick={() => updateSet(exIdx, setIdx, "weight", Math.max(0, (s.weight ?? 0) - 2.5))}
                      className={`w-7 h-7 rounded-lg ${colors.bg.overlay} text-sm font-bold ${colors.interactive.base} ${colors.interactive.hover} shrink-0`}
                    >−</button>
                    <input
                      type="number"
                      value={s.weight ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="kg"
                      className={`w-14 text-center px-1 py-1.5 rounded-lg ${colors.bg.base} border ${colors.border.default} text-sm focus:outline-none focus:border-zinc-500`}
                    />
                    <button
                      onClick={() => updateSet(exIdx, setIdx, "weight", (s.weight ?? 0) + 2.5)}
                      className={`w-7 h-7 rounded-lg ${colors.bg.overlay} text-sm font-bold ${colors.interactive.base} ${colors.interactive.hover} shrink-0`}
                    >+</button>
                  </div>

                  <span className={`text-xs ${colors.text.muted}`}>×</span>

                  {/* Reps */}
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      onClick={() => updateSet(exIdx, setIdx, "reps", Math.max(1, (s.reps ?? 1) - 1))}
                      className={`w-7 h-7 rounded-lg ${colors.bg.overlay} text-sm font-bold ${colors.interactive.base} ${colors.interactive.hover} shrink-0`}
                    >−</button>
                    <input
                      type="number"
                      value={s.reps ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="reps"
                      className={`w-14 text-center px-1 py-1.5 rounded-lg ${colors.bg.base} border ${colors.border.default} text-sm focus:outline-none focus:border-zinc-500`}
                    />
                    <button
                      onClick={() => updateSet(exIdx, setIdx, "reps", (s.reps ?? 0) + 1)}
                      className={`w-7 h-7 rounded-lg ${colors.bg.overlay} text-sm font-bold ${colors.interactive.base} ${colors.interactive.hover} shrink-0`}
                    >+</button>
                  </div>

                  {/* Remove set */}
                  <button
                    onClick={() => removeSet(exIdx, setIdx)}
                    className={`text-xs ${colors.text.muted} hover:${colors.accent.red.text} ${colors.interactive.base} shrink-0`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className={`px-4 py-2.5 border-t ${colors.border.muted}`}>
              <button
                onClick={() => addSet(exIdx)}
                className={`text-xs ${colors.text.muted} hover:text-white ${colors.interactive.base}`}
              >
                + Add set
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={openExPicker}
          className={`w-full py-3 rounded-2xl border border-dashed ${colors.border.strong} text-sm ${colors.text.muted} hover:text-white hover:border-zinc-500 ${colors.interactive.base}`}
        >
          + Add Exercise
        </button>
      </main>

      {/* Exercise picker */}
      {showExPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowExPicker(false)} />
          <div className={`relative w-full max-w-lg ${colors.bg.elevated} border ${colors.border.default} rounded-t-3xl sm:rounded-3xl max-h-[70vh] flex flex-col`}>
            <div className={`px-4 pt-4 pb-3 border-b ${colors.border.default}`}>
              <p className="font-semibold text-sm mb-3">Add Exercise</p>
              <input
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm focus:outline-none focus:border-zinc-500`}
              />
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-zinc-800/60">
              {filteredLibrary.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addExercise(e)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left ${colors.interactive.base} ${colors.interactive.hover}`}
                >
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className={`text-xs ${colors.text.muted}`}>{e.muscle_group}</p>
                  </div>
                  <span className={`text-xs ${colors.text.muted}`}>+</span>
                </button>
              ))}
              {filteredLibrary.length === 0 && (
                <p className={`text-sm ${colors.text.muted} text-center py-8`}>No exercises found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => !finishing && setShowFinishModal(false)} />
          <div className={`relative w-full max-w-lg ${colors.bg.elevated} border ${colors.border.default} rounded-t-3xl sm:rounded-3xl p-6 space-y-4`}>
            <p className="font-semibold text-base">Finish Workout</p>

            <div>
              <label className={`text-xs ${colors.text.muted} mb-1 block`}>Workout name</label>
              <input
                placeholder={state.routine_name ?? "Today's Workout"}
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm focus:outline-none focus:border-zinc-500`}
              />
            </div>

            <div className={`${colors.bg.base} rounded-xl px-4 py-3 space-y-1`}>
              <p className="text-sm font-medium">{doneSetsCount} sets completed</p>
              <p className={`text-xs ${colors.text.muted}`}>
                across {state.exercises.filter((e) => e.sets.some((s) => s.done)).length} exercises
              </p>
              {state.exercises.some((e) => e.is_new) && (
                <p className={`text-xs ${colors.accent.green.text} mt-1`}>
                  {state.exercises.filter((e) => e.is_new).length} new exercise(s) will be added to your routine.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                disabled={finishing}
                className={`flex-1 py-3 rounded-xl border ${colors.border.default} text-sm font-semibold ${colors.text.secondary} ${colors.interactive.base} ${colors.interactive.hover} disabled:opacity-40`}
              >
                Back
              </button>
              <button
                onClick={finish}
                disabled={finishing || doneSetsCount === 0}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold ${colors.accent.primary} disabled:opacity-40`}
              >
                {finishing ? "Saving..." : "Save Workout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

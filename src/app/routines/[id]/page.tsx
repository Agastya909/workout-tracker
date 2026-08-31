"use client";

import { useEffect, useState, use, useCallback } from "react";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type DraftSet = {
  set_number: number;
  default_reps: number | null;
  default_weight: number | null;
};

type DraftExercise = {
  // undefined for exercises added locally before first save
  routine_exercise_id?: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  position: number;
  sets: DraftSet[];
};

type Draft = {
  routine_id: string;
  name: string;
  description: string;
  exercises: DraftExercise[];
};

type LibraryExercise = { id: string; name: string; muscle_group: string };

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Olympic", "Cardio"];
const EXERCISE_TYPES = ["strength", "cardio", "bodyweight", "olympic"];

// ── localStorage helpers ───────────────────────────────────────────────────

function draftKey(id: string) { return `routine_draft_${id}`; }

function loadDraft(id: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDraft(draft: Draft) {
  localStorage.setItem(draftKey(draft.routine_id), JSON.stringify(draft));
}

function clearDraft(id: string) {
  localStorage.removeItem(draftKey(id));
}

// ── Component ──────────────────────────────────────────────────────────────

export default function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // exercise picker
  const [showPicker, setShowPicker] = useState(false);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState(MUSCLE_GROUPS[0]);
  const [newType, setNewType] = useState(EXERCISE_TYPES[0]);
  const [creating, setCreating] = useState(false);

  // ── Load ──

  useEffect(() => {
    async function init() {
      // prefer draft from localStorage (unsaved edits)
      const local = loadDraft(id);
      if (local) {
        setDraft(local);
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch<{
          id: string; name: string; description: string;
          exercises: Array<{
            id: string; exercise_id: string; exercise_name: string;
            muscle_group: string; position: number;
            sets: Array<{ id: string; set_number: number; default_reps: number | null; default_weight: number | null }>;
          }>;
        }>(`/routines/${id}`);
        const d: Draft = {
          routine_id: data.id,
          name: data.name,
          description: data.description,
          exercises: data.exercises.map((ex) => ({
            routine_exercise_id: ex.id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            position: ex.position,
            sets: ex.sets.map((s) => ({
              set_number: s.set_number,
              default_reps: s.default_reps,
              default_weight: s.default_weight,
            })),
          })),
        };
        setDraft(d);
      } catch {}
      setLoading(false);
    }
    init();
  }, [id]);

  // warn on navigate away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── Update helpers ──

  function update(updater: (prev: Draft) => Draft) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveDraft(next);
      setDirty(true);
      return next;
    });
  }

  // ── Save to API ──

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError("");
    try {
      await apiFetch(`/routines/${id}/full`, {
        method: "PUT",
        body: JSON.stringify({
          exercises: draft.exercises.map((ex) => ({
            exercise_id: ex.exercise_id,
            sets: ex.sets,
          })),
        }),
      });
      // refresh from server to get real IDs
      const data = await apiFetch<{
        id: string; name: string; description: string;
        exercises: Array<{
          id: string; exercise_id: string; exercise_name: string;
          muscle_group: string; position: number;
          sets: Array<{ id: string; set_number: number; default_reps: number | null; default_weight: number | null }>;
        }>;
      }>(`/routines/${id}`);
      const refreshed: Draft = {
        routine_id: data.id,
        name: data.name,
        description: data.description,
        exercises: data.exercises.map((ex) => ({
          routine_exercise_id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          position: ex.position,
          sets: ex.sets.map((s) => ({
            set_number: s.set_number,
            default_reps: s.default_reps,
            default_weight: s.default_weight,
          })),
        })),
      };
      clearDraft(id);
      setDraft(refreshed);
      setDirty(false);
    } catch {
      setSaveError("Failed to save. Try again.");
    }
    setSaving(false);
  }, [draft, id]);

  // ── Exercise picker ──

  async function openPicker() {
    if (library.length === 0) {
      try {
        const data = await apiFetch<LibraryExercise[]>("/exercises");
        setLibrary(data ?? []);
      } catch {}
    }
    setShowPicker(true);
  }

  function closePicker() {
    setShowPicker(false);
    setSearch("");
    setMuscleFilter(null);
    setShowCreateForm(false);
    setNewName("");
    setNewMuscle(MUSCLE_GROUPS[0]);
    setNewType(EXERCISE_TYPES[0]);
  }

  function addExerciseFromLibrary(ex: LibraryExercise) {
    update((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exercise_id: ex.id,
          exercise_name: ex.name,
          muscle_group: ex.muscle_group,
          position: prev.exercises.length,
          sets: [{ set_number: 1, default_reps: null, default_weight: null }],
        },
      ],
    }));
    closePicker();
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ex = await apiFetch<{ id: string }>("/exercises", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), muscle_group: newMuscle, type: newType }),
      });
      const newEx: LibraryExercise = { id: ex.id, name: newName.trim(), muscle_group: newMuscle };
      setLibrary((prev) => [...prev, newEx]);
      addExerciseFromLibrary(newEx);
    } catch {}
    setCreating(false);
  }

  // ── Exercise / set mutations ──

  function removeExercise(exIdx: number) {
    update((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exIdx).map((e, i) => ({ ...e, position: i })),
    }));
  }

  function addSet(exIdx: number) {
    update((prev) => {
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: [...ex.sets, { set_number: ex.sets.length + 1, default_reps: null, default_weight: null }],
        };
      });
      return { ...prev, exercises };
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    update((prev) => {
      const exercises = prev.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets
            .filter((_, si) => si !== setIdx)
            .map((s, si) => ({ ...s, set_number: si + 1 })),
        };
      });
      return { ...prev, exercises };
    });
  }

  function updateSet(exIdx: number, setIdx: number, field: "default_reps" | "default_weight", raw: string) {
    const val = raw === "" ? null : field === "default_reps" ? parseInt(raw) : parseFloat(raw);
    update((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: val }),
        }
      ),
    }));
  }

  // ── Render ──

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg.base} flex items-center justify-center`}>
        <p className={`text-sm ${colors.text.muted}`}>Loading...</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className={`min-h-screen ${colors.bg.base} flex items-center justify-center`}>
        <p className={`text-sm ${colors.text.muted}`}>Routine not found.</p>
      </div>
    );
  }

  const filteredLibrary = library.filter(
    (e) =>
      !draft.exercises.some((ex) => ex.exercise_id === e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase()) &&
      (muscleFilter === null || e.muscle_group === muscleFilter)
  );

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary} pb-24`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a
          href="/routines"
          onClick={(e) => {
            if (dirty && !confirm("You have unsaved changes. Leave anyway?")) e.preventDefault();
          }}
          className={`text-sm ${colors.text.secondary} ${colors.interactive.base}`}
        >
          ← Back
        </a>
        <span className="text-base font-semibold tracking-tight">{draft.name}</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {draft.description && (
          <p className={`text-sm ${colors.text.muted}`}>{draft.description}</p>
        )}

        {draft.exercises.length === 0 && (
          <div className="text-center py-12">
            <p className={`text-sm ${colors.text.muted}`}>No exercises yet. Add one below.</p>
          </div>
        )}

        {draft.exercises.map((ex, exIdx) => (
          <div key={exIdx} className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${colors.border.default}`}>
              <div>
                <p className="font-semibold text-sm">{ex.exercise_name}</p>
                <p className={`text-xs ${colors.text.muted}`}>{ex.muscle_group}</p>
              </div>
              <button
                onClick={() => removeExercise(exIdx)}
                className={`text-xs px-2.5 py-1 rounded-lg ${colors.accent.red.button} font-medium ${colors.interactive.base}`}
              >
                Remove
              </button>
            </div>

            {ex.sets.length === 0 && (
              <p className={`text-xs ${colors.text.muted} px-4 py-3`}>No sets yet.</p>
            )}

            <div className="divide-y divide-zinc-800/60">
              {ex.sets.map((s, setIdx) => (
                <div key={setIdx} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-xs ${colors.text.muted} w-12 shrink-0`}>Set {s.set_number}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="—"
                        value={s.default_reps ?? ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "default_reps", e.target.value)}
                        className={`w-16 px-2 py-1.5 rounded-lg ${colors.bg.base} border ${colors.border.default} text-sm text-center focus:outline-none focus:border-zinc-500`}
                      />
                      <span className={`text-xs ${colors.text.muted}`}>reps</span>
                    </div>
                    <span className={`text-xs ${colors.text.muted}`}>@</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="—"
                        value={s.default_weight ?? ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "default_weight", e.target.value)}
                        className={`w-16 px-2 py-1.5 rounded-lg ${colors.bg.base} border ${colors.border.default} text-sm text-center focus:outline-none focus:border-zinc-500`}
                      />
                      <span className={`text-xs ${colors.text.muted}`}>kg</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSet(exIdx, setIdx)}
                    className={`text-xs ${colors.accent.red.text} ${colors.interactive.base} hover:opacity-70 shrink-0`}
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
          onClick={openPicker}
          className={`w-full py-3 rounded-2xl border border-dashed ${colors.border.strong} text-sm ${colors.text.muted} hover:text-white hover:border-zinc-500 ${colors.interactive.base}`}
        >
          + Add Exercise
        </button>
      </main>

      {/* Sticky save bar */}
      {dirty && (
        <div className={`fixed bottom-0 inset-x-0 border-t ${colors.border.default} ${colors.bg.surface} px-4 py-4`}>
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {saveError && <p className={`text-xs ${colors.accent.red.text} flex-1`}>{saveError}</p>}
            {!saveError && <p className={`text-xs ${colors.text.muted} flex-1`}>Unsaved changes</p>}
            <button
              onClick={save}
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm ${colors.accent.primary} disabled:opacity-40`}
            >
              {saving ? "Saving..." : "Save Routine"}
            </button>
          </div>
        </div>
      )}

      {/* Exercise picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={closePicker} />
          <div className={`relative w-full max-w-lg ${colors.bg.elevated} border ${colors.border.default} rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col overflow-hidden`}>
            <div className={`px-4 pt-4 pb-3 border-b ${colors.border.default} shrink-0 space-y-3`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Add Exercise</p>
                <button onClick={closePicker} className={`text-xs ${colors.text.muted} hover:text-white ${colors.interactive.base}`}>✕</button>
              </div>
              <input
                autoFocus
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowCreateForm(false); }}
                className={`w-full px-3 py-2 rounded-xl ${colors.bg.base} border ${colors.border.default} text-sm focus:outline-none focus:border-zinc-500`}
              />
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {MUSCLE_GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setMuscleFilter(muscleFilter === g ? null : g)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${colors.interactive.base} ${
                      muscleFilter === g
                        ? "bg-white text-black"
                        : `${colors.bg.overlay} ${colors.text.secondary} hover:bg-zinc-700`
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-zinc-800/60 pb-2">
              {filteredLibrary.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addExerciseFromLibrary(e)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left ${colors.interactive.base} ${colors.interactive.hover}`}
                >
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className={`text-xs ${colors.text.muted}`}>{e.muscle_group}</p>
                  </div>
                  <span className={`text-xs ${colors.text.muted}`}>+</span>
                </button>
              ))}

              {!showCreateForm ? (
                <button
                  onClick={() => { setShowCreateForm(true); setNewName(search); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left ${colors.interactive.base} ${colors.interactive.hover}`}
                >
                  <span className="text-lg">➕</span>
                  <div>
                    <p className="text-sm font-medium">
                      {search.trim() ? `Create "${search.trim()}"` : "Create new exercise"}
                    </p>
                    <p className={`text-xs ${colors.text.muted}`}>Add a custom exercise to your library</p>
                  </div>
                </button>
              ) : (
                <div className={`px-4 py-4 space-y-3 ${colors.bg.base}`}>
                  <p className="text-sm font-semibold">New Exercise</p>
                  <input
                    autoFocus
                    placeholder="Exercise name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl ${colors.bg.elevated} border ${colors.border.default} text-sm focus:outline-none focus:border-zinc-500`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${colors.text.muted} mb-1 block`}>Muscle group</label>
                      <select
                        value={newMuscle}
                        onChange={(e) => setNewMuscle(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl ${colors.bg.elevated} border ${colors.border.default} text-sm focus:outline-none`}
                      >
                        {MUSCLE_GROUPS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs ${colors.text.muted} mb-1 block`}>Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl ${colors.bg.elevated} border ${colors.border.default} text-sm focus:outline-none`}
                      >
                        {EXERCISE_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className={`flex-1 py-2 rounded-xl border ${colors.border.default} text-sm ${colors.text.secondary} ${colors.interactive.base} ${colors.interactive.hover}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createAndAdd}
                      disabled={creating || !newName.trim()}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold ${colors.accent.primary} disabled:opacity-40`}
                    >
                      {creating ? "Creating..." : "Create & Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

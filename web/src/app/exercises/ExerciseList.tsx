"use client";

import { colors } from "@/lib/colors";
import { useState } from "react";
import type { Exercise } from "./page";
import AddExerciseModal from "./AddExerciseModal";

const TYPE_BADGE: Record<string, string> = {
  strength: colors.accent.blue.badge,
  bodyweight: colors.accent.green.badge,
  cardio: colors.accent.orange.badge,
  olympic: colors.accent.yellow.badge,
};

export default function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [list, setList] = useState(exercises);

  const filtered = list.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, e) => {
    (acc[e.muscle_group] ??= []).push(e);
    return acc;
  }, {});

  const groups = Object.keys(grouped).sort();

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 rounded-xl ${colors.bg.elevated} border ${colors.border.strong} ${colors.text.primary} px-4 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500`}
        />
        <button
          onClick={() => setShowAdd(true)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${colors.accent.primary}`}
        >
          + Add
        </button>
      </div>

      {groups.length === 0 && (
        <p className={`text-sm ${colors.text.muted} text-center py-12`}>No exercises found.</p>
      )}

      {groups.map((group) => (
        <div key={group}>
          <h3 className={`text-xs font-semibold uppercase tracking-widest ${colors.text.muted} mb-2 px-1`}>
            {group}
          </h3>
          <div className={`rounded-2xl ${colors.bg.elevated} border ${colors.border.default} divide-y divide-zinc-800`}>
            {grouped[group].map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className={`text-sm font-medium ${colors.text.primary}`}>{e.name}</p>
                  {!e.is_global && (
                    <p className={`text-xs ${colors.text.muted}`}>Custom</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[e.type] ?? colors.accent.blue.badge}`}>
                  {e.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showAdd && (
        <AddExerciseModal
          onClose={() => setShowAdd(false)}
          onAdded={(ex) => setList((prev) => [...prev, ex])}
        />
      )}
    </div>
  );
}

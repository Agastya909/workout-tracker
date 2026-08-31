"use client";

import { useState } from "react";
import Link from "next/link";
import { colors } from "@/lib/colors";
import { apiFetch } from "@/lib/api";
import { parseImportCsv, groupRowsIntoSessions, type ImportSession } from "@/lib/csv";

export default function ImportWorkoutsPage() {
  const [fileName, setFileName] = useState("");
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ workouts_created: number; sets_created: number } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = parseImportCsv(text);
      setSessions(groupRowsIntoSessions(rows));
    } catch (err) {
      setSessions([]);
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      const res = await apiFetch<{ workouts_created: number; sets_created: number }>(
        "/workouts/import",
        { method: "POST", body: JSON.stringify({ sessions }) }
      );
      setResult(res);
      setSessions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
    setImporting(false);
  }

  const totalSets = sessions.reduce(
    (sum, s) => sum + s.exercises.reduce((a, e) => a + e.sets.length, 0),
    0
  );

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <Link href="/workouts" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </Link>
        <span className="text-base font-semibold tracking-tight">Import Workouts</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl p-4 space-y-3`}>
          <p className={`text-sm ${colors.text.secondary}`}>
            Upload a CSV with columns: <code className={colors.text.primary}>date, workout_name, exercise_name, set_number, weight, reps, is_bodyweight</code>
          </p>
          <label
            className={`block text-center px-4 py-3 rounded-xl border border-dashed ${colors.border.strong} text-sm font-medium cursor-pointer ${colors.interactive.hover} ${colors.interactive.base}`}
          >
            {fileName || "Choose CSV file"}
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </label>
        </div>

        {error && (
          <div className={`${colors.accent.red.bg} border ${colors.accent.red.border} rounded-xl px-4 py-3 text-sm ${colors.accent.red.text}`}>
            {error}
          </div>
        )}

        {result && (
          <div className={`${colors.accent.green.bg} border ${colors.accent.green.border} rounded-xl px-4 py-3 text-sm ${colors.accent.green.text}`}>
            Imported {result.workouts_created} workouts, {result.sets_created} sets.{" "}
            <Link href="/workouts" className="underline">View workouts →</Link>
          </div>
        )}

        {sessions.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${colors.text.secondary}`}>
                {sessions.length} sessions, {totalSets} sets found
              </p>
              <button
                onClick={handleImport}
                disabled={importing}
                className={`px-4 py-2 rounded-xl font-semibold text-sm ${colors.accent.primary} disabled:opacity-40`}
              >
                {importing ? "Importing…" : "Confirm Import"}
              </button>
            </div>

            <div className="space-y-3">
              {sessions.map((session, i) => (
                <div key={i} className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${colors.border.default} flex items-center justify-between`}>
                    <p className="font-semibold text-sm">{session.workout_name}</p>
                    <p className={`text-xs ${colors.text.muted}`}>{session.date}</p>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {session.exercises.map((ex) => (
                      <div key={ex.exercise_name} className="px-4 py-2.5">
                        <p className="text-sm font-medium">{ex.exercise_name}</p>
                        <p className={`text-xs ${colors.text.muted} mt-1`}>
                          {ex.sets
                            .map((s) => (s.is_bodyweight ? `BW×${s.reps}` : `${s.weight}×${s.reps}`))
                            .join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

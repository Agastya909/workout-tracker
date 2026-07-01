import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";

type WorkoutSet = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps?: number;
  weight?: number;
  rpe?: number;
};

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await serverFetch<{ sets: WorkoutSet[] }>(`/workouts/${id}`);
  const sets = data?.sets ?? [];

  const grouped = sets.reduce<Record<string, WorkoutSet[]>>((acc, s) => {
    (acc[s.exercise_name] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/workouts" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </a>
        <span className="text-base font-semibold tracking-tight">Workout</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {sets.length === 0 && (
          <p className={`text-sm ${colors.text.muted} text-center py-12`}>No sets recorded.</p>
        )}

        {Object.entries(grouped).map(([exercise, exSets]) => (
          <div key={exercise} className={`${colors.bg.elevated} border ${colors.border.default} rounded-2xl overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${colors.border.default}`}>
              <p className="font-semibold text-sm">{exercise}</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {exSets.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className={`text-xs ${colors.text.muted}`}>Set {s.set_number}</span>
                  <div className="flex gap-4">
                    {s.weight != null && <span className="text-sm font-medium">{s.weight} kg</span>}
                    {s.reps != null && <span className={`text-sm ${colors.text.secondary}`}>× {s.reps}</span>}
                    {s.rpe != null && <span className={`text-xs ${colors.accent.yellow.text}`}>RPE {s.rpe}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";

type Workout = {
  id: string;
  name: string;
  date: string;
  notes: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workouts = await serverFetch<Workout[]>("/workouts") ?? [];

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/dashboard" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </a>
        <span className="text-base font-semibold tracking-tight">Workouts</span>
        <a href="/workouts/new" className={`text-sm font-semibold ${colors.text.primary} ${colors.interactive.base}`}>
          + New
        </a>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {workouts.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">💪</p>
            <p className={`text-sm ${colors.text.muted}`}>No workouts yet. Log your first one!</p>
            <a
              href="/workouts/new"
              className={`inline-block mt-2 rounded-xl ${colors.accent.primary} font-semibold px-6 py-2.5 text-sm`}
            >
              Log Workout
            </a>
          </div>
        )}

        {workouts.map((w) => (
          <a
            key={w.id}
            href={`/workouts/${w.id}`}
            className={`flex items-center justify-between px-4 py-4 rounded-2xl ${colors.bg.elevated} border ${colors.border.default} ${colors.interactive.base} ${colors.interactive.hover} ${colors.interactive.hoverBorder}`}
          >
            <div>
              <p className="font-semibold text-sm">{w.name || "Workout"}</p>
              <p className={`text-xs ${colors.text.muted} mt-0.5`}>{formatDate(w.date)}</p>
            </div>
            <span className={`text-xs ${colors.text.muted}`}>→</span>
          </a>
        ))}
      </main>
    </div>
  );
}

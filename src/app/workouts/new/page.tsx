import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import type { Exercise } from "@/app/exercises/page";
import WorkoutLogger from "./WorkoutLogger";

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const exercises = await serverFetch<Exercise[]>("/exercises") ?? [];

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <Link href="/workouts" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </Link>
        <span className="text-base font-semibold tracking-tight">Log Workout</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <WorkoutLogger exercises={exercises} />
      </main>
    </div>
  );
}

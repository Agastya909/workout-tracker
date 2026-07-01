import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";
import ExerciseList from "./ExerciseList";

export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  type: string;
  is_global: boolean;
  user_id?: string;
};

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const exercises = await serverFetch<Exercise[]>("/exercises") ?? [];

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/dashboard" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </a>
        <span className="text-base font-semibold tracking-tight">Exercises</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <ExerciseList exercises={exercises} />
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import ProgressChart from "./ProgressChart";

type ExerciseOption = { id: string; name: string };

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const exercises = await serverFetch<ExerciseOption[]>("/progress?days=30") ?? [];

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <Link href="/" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </Link>
        <span className="text-base font-semibold tracking-tight">Progress</span>
        <div className="w-12" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {exercises.length === 0 ? (
          <p className={`text-sm ${colors.text.muted} text-center py-20`}>
            No workouts logged in the last 30 days yet.
          </p>
        ) : (
          <ProgressChart exercises={exercises} />
        )}
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Workout Tracker</h1>
        <span className="text-sm text-gray-400">{user.email}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-gray-400">
          Welcome! Start by logging a workout or browsing exercises.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Log Workout", href: "/workouts/new", icon: "💪" },
            { label: "Exercises", href: "/exercises", icon: "🏋️" },
            { label: "Body Metrics", href: "/metrics", icon: "📊" },
          ].map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="flex flex-col items-center gap-3 rounded-2xl bg-gray-900 border border-gray-800 p-6 hover:border-gray-600 transition-colors"
            >
              <span className="text-3xl">{card.icon}</span>
              <span className="text-sm font-medium text-center">{card.label}</span>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import Link from "next/link";

const navCards = [
  { label: "Start Workout", href: "/workout/start", icon: "💪" },
  { label: "History", href: "/workouts", icon: "📋" },
  { label: "Routines", href: "/routines", icon: "📅" },
  { label: "Exercises", href: "/exercises", icon: "🏋️" },
  { label: "Body Metrics", href: "/metrics", icon: "⚖️" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <span className="text-base font-semibold tracking-tight">Workout Tracker</span>
        <Link href="/profile" className={`text-xs ${colors.text.muted} hover:${colors.text.primary} ${colors.interactive.base}`}>
          {user.email}
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className={`mt-1 text-sm ${colors.text.secondary}`}>What are we doing today?</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`flex flex-col items-center gap-3 rounded-2xl ${colors.bg.elevated} border ${colors.border.default} p-6 ${colors.interactive.base} ${colors.interactive.hoverBorder} ${colors.interactive.hover}`}
            >
              <span className="text-3xl">{card.icon}</span>
              <span className="text-sm font-medium text-center">{card.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

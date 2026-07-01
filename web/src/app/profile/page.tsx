import { createClient } from "@/lib/supabase/server";
import { colors } from "@/lib/colors";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";

  return (
    <div className={`min-h-screen ${colors.bg.base} ${colors.text.primary}`}>
      <header className={`border-b ${colors.border.default} px-4 py-4 flex items-center justify-between`}>
        <a href="/" className={`text-sm ${colors.text.secondary} hover:${colors.text.primary} ${colors.interactive.base}`}>
          ← Back
        </a>
        <span className="text-base font-semibold tracking-tight">Profile</span>
        <div className="w-12" />
      </header>

      <main className="max-w-sm mx-auto px-4 py-10 space-y-6">
        <div className={`flex flex-col items-center gap-3 py-8 rounded-2xl ${colors.bg.elevated} border ${colors.border.default}`}>
          <div className={`w-16 h-16 rounded-full ${colors.bg.overlay} flex items-center justify-center text-2xl font-bold ${colors.text.primary}`}>
            {name[0].toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">{name}</p>
            <p className={`text-sm ${colors.text.muted}`}>{user.email}</p>
          </div>
        </div>

        <LogoutButton />
      </main>
    </div>
  );
}

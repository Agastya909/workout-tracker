"use client";

import { createClient } from "@/lib/supabase/client";
import { colors } from "@/lib/colors";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`w-full rounded-xl border ${colors.accent.red.border} ${colors.accent.red.text} py-2.5 text-sm font-medium ${colors.interactive.base} hover:${colors.accent.red.bg} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}

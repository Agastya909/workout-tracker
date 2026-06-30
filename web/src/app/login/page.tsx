"use client";

import { createClient } from "@/lib/supabase/client";
import { colors } from "@/lib/colors";
import { useState } from "react";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${colors.bg.base} px-4`}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className={`text-3xl font-bold ${colors.text.primary} tracking-tight`}>
            Workout Tracker
          </h1>
          <p className={`mt-2 text-sm ${colors.text.secondary}`}>
            Track your lifts, progress your body.
          </p>
        </div>

        <div className={`${colors.bg.elevated} rounded-2xl p-8 space-y-5 border ${colors.border.default}`}>
          <div className={`flex rounded-xl overflow-hidden border ${colors.border.strong}`}>
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setMessage(null); }}
                className={`flex-1 py-2 text-sm font-medium ${colors.interactive.base} ${
                  mode === m
                    ? `${colors.bg.overlay} ${colors.text.primary}`
                    : `${colors.text.secondary} hover:${colors.text.primary}`
                }`}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {error && (
            <p className={`text-sm ${colors.accent.red.text} ${colors.accent.red.bg} border ${colors.accent.red.border} rounded-lg px-4 py-3`}>
              {error}
            </p>
          )}
          {message && (
            <p className={`text-sm ${colors.accent.green.text} ${colors.accent.green.bg} border ${colors.accent.green.border} rounded-lg px-4 py-3`}>
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1.5`} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-4 py-3 text-base placeholder-zinc-600 focus:outline-none focus:border-zinc-500`}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${colors.text.secondary} mb-1.5`} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl ${colors.bg.input} border ${colors.border.strong} ${colors.text.primary} px-4 py-3 text-base placeholder-zinc-600 focus:outline-none focus:border-zinc-500`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl ${colors.accent.primary} font-semibold py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed ${colors.interactive.base}`}
            >
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

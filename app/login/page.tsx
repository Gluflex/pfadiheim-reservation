"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GROUPS, GROUP_COLORS, STUFEN, STUFE_TINT, type Group } from "@/lib/constants";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [group, setGroup] = useState<Group | "">("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!group) {
      setError("Bitte wähle ein Fähnli aus.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      const next = params.get("next") || "/";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/pfadiheim.webp')" }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/40 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-1 text-zinc-900 dark:text-zinc-50">Pfadiheim Reservation</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Melde dich mit deinem Fähnli an.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Fähnli</label>
            <div className="grid grid-cols-3 gap-2">
              {GROUPS.map((g) => {
                const c = GROUP_COLORS[g];
                const tint = STUFE_TINT[STUFEN[g]];
                const active = group === g;
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGroup(g)}
                    className={`text-xs font-medium px-2 py-2 rounded-lg transition-all ${
                      active
                        ? `${c.bg} ${c.text} ring-2 ${c.ring} shadow-md`
                        : `${tint.bg} ${tint.bgHover} text-zinc-700 dark:text-zinc-200`
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Passwort
            </label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !group || !password}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {submitting ? "Anmelden …" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

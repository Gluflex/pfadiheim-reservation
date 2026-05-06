"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GROUPS,
  GROUP_COLORS,
  STUFEN,
  STUFE_TINT,
  ROOMS,
  type Group,
  type Room,
} from "@/lib/constants";

type Reservation = {
  id: number;
  group_name: Group;
  room: Room;
  date: string;
  start_hour: number;
  end_hour: number;
  note: string | null;
};

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

  const [nextSat, setNextSat] = useState<{ iso: string; label: string } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay();
    const daysUntilSat = (6 - dow + 7) % 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysUntilSat);
    const iso = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, "0")}-${String(sat.getDate()).padStart(2, "0")}`;
    const label = sat.toLocaleDateString("de-CH", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    setNextSat({ iso, label });

    fetch(`/api/reservations?from=${iso}&to=${iso}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { reservations: [] }))
      .then((data) => setReservations(data.reservations ?? []))
      .catch(() => setReservations([]))
      .finally(() => setLoadingRes(false));
  }, []);

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
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-cover bg-center"
      style={{ backgroundImage: "url('/pfadiheim.webp')" }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" aria-hidden="true" />
      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-4">
        {/* Login card */}
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/40 dark:border-zinc-800">
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

        {/* Upcoming Saturday card */}
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/40 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Nächster Samstag</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {nextSat?.label ?? "…"}
          </p>

          {loadingRes ? (
            <p className="text-sm text-zinc-500">Lade …</p>
          ) : (
            <ul className="space-y-3">
              {ROOMS.map((room) => {
                const roomRes = reservations
                  .filter((r) => r.room === room)
                  .sort((a, b) => a.start_hour - b.start_hour);
                return (
                  <li key={room} className="flex items-start gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300 pt-0.5">
                      {room}
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {roomRes.length === 0 ? (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">Frei</span>
                      ) : (
                        roomRes.map((r) => {
                          const c = GROUP_COLORS[r.group_name];
                          return (
                            <span
                              key={r.id}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${c.bg} ${c.text}`}
                              title={r.note ?? undefined}
                            >
                              <span>{r.group_name}</span>
                              <span className="opacity-90">
                                {String(r.start_hour).padStart(2, "0")}–{String(r.end_hour).padStart(2, "0")}
                              </span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

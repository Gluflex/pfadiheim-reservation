"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GROUPS,
  STUFEN,
  STUFE_TINT,
  STUFE_BLOCK,
  STUFE_RING,
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
  const [tappedGroup, setTappedGroup] = useState<Group | null>(null);

  function pickGroup(g: Group) {
    setGroup(g);
    setTappedGroup(null);
    // Force the animation class to re-mount on the next tick.
    requestAnimationFrame(() => setTappedGroup(g));
    window.setTimeout(() => setTappedGroup(null), 320);
  }

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
      className="min-h-screen flex flex-col bg-cover bg-center"
      style={{ backgroundImage: "url('/pfadiheim.webp')" }}
    >
      {/* Soft uniform tint */}
      <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
      {/* Vignette: dark edges, transparent middle */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 35%, rgba(0,0,0,0.55) 90%, rgba(0,0,0,0.75) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Brand wordmark, top-left */}
      <div className="relative z-10 px-6 sm:px-10 pt-6 sm:pt-8">
        <span className="font-script text-4xl sm:text-5xl text-white text-shadow-soft select-none">
          Pfadi Baar
        </span>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_minmax(0,420px)] gap-8 lg:gap-12 items-start">
          {/* Login card */}
          <div className="order-1 lg:order-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-2xl p-7 sm:p-8 border border-white/40 dark:border-zinc-800">
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
              Pfadiheim
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-6">
              Melde dich mit deinem Fähnli an.
            </p>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Fähnli
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GROUPS.map((g) => {
                    const tint = STUFE_TINT[STUFEN[g]];
                    const ring = STUFE_RING[STUFEN[g]];
                    const active = group === g;
                    const tapped = tappedGroup === g;
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => pickGroup(g)}
                        className={`text-xs px-2 py-2 rounded-lg
                          ${tint.bg} ${tint.bgHover}
                          transition-[box-shadow,color,font-weight] duration-200 ease-out
                          active:scale-95 will-change-transform
                          ${active
                            ? `ring-2 ${ring} font-bold text-zinc-900 dark:text-zinc-50 shadow-sm`
                            : "font-medium text-zinc-700 dark:text-zinc-200"
                          }
                          ${tapped ? "animate-tap" : ""}
                        `}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="pw"
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2"
                >
                  Passwort
                </label>
                <input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {submitting ? "Anmelden …" : "Anmelden"}
              </button>
            </form>
          </div>

          {/* Upcoming Saturday — no card chrome, white-on-photo */}
          <div className="order-2 lg:order-1 text-white text-shadow-soft">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200 mb-3 font-semibold">
              Dieser Samstag
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              {nextSat?.label ?? "…"}
            </h2>

            {loadingRes ? (
              <p className="mt-6 text-sm text-white/80">Lade Reservationen …</p>
            ) : (
              <ul className="mt-6 divide-y divide-white/20">
                {ROOMS.map((room) => {
                  const roomRes = reservations
                    .filter((r) => r.room === room)
                    .sort((a, b) => a.start_hour - b.start_hour);
                  return (
                    <li key={room} className="py-3 flex items-baseline gap-4">
                      <div className="w-28 shrink-0 text-sm font-semibold tracking-wide">
                        {room}
                      </div>
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {roomRes.length === 0 ? (
                          <span className="text-xs text-white/55 italic font-normal">Frei</span>
                        ) : (
                          roomRes.map((r) => {
                            const block = STUFE_BLOCK[STUFEN[r.group_name]];
                            return (
                              <span
                                key={r.id}
                                className={`inline-flex items-baseline gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${block.bg} ${block.text} shadow-sm`}
                                title={r.note ?? undefined}
                              >
                                <span>{r.group_name}</span>
                                <span className="font-normal opacity-90 tabular-nums">
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
    </div>
  );
}

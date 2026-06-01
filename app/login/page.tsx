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

// PTA bekommt einen verspielten Konfetti-Ballon-Hintergrund statt der flachen Tönung.
const PTA_CONFETTI_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='42' height='42' viewBox='0 0 42 42'>" +
  "<g opacity='0.5' fill='#14b8a6'>" +
  "<ellipse cx='11' cy='11' rx='3.6' ry='4.6'/><path d='M11,15.5 q.9,2.2 0,4.4' stroke='#14b8a6' stroke-width='0.6' fill='none'/>" +
  "<ellipse cx='31' cy='28' rx='3.6' ry='4.6'/><path d='M31,32.5 q.9,2.2 0,4.4' stroke='#14b8a6' stroke-width='0.6' fill='none'/>" +
  "<circle cx='31' cy='9' r='1.5'/><circle cx='9' cy='31' r='1.5'/><circle cx='21' cy='20' r='1.2'/>" +
  "</g></svg>";
const PTA_CONFETTI_BG = `url("data:image/svg+xml,${encodeURIComponent(PTA_CONFETTI_SVG)}")`;

const BALLOON_COLORS: ReadonlyArray<readonly [string, string]> = [
  ["#fecaca", "#ef4444"], ["#fde68a", "#f59e0b"], ["#bbf7d0", "#22c55e"],
  ["#bfdbfe", "#3b82f6"], ["#fbcfe8", "#ec4899"], ["#ddd6fe", "#8b5cf6"],
  ["#99f6e4", "#14b8a6"],
];

/** Schiesst beim Antippen einen kleinen Schwung Ballons über dem Button nach oben. */
function launchBalloons(e: React.MouseEvent<HTMLElement>) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const ox = rect.left + rect.width / 2;
  const oy = rect.top + rect.height * 0.35;

  let layer = document.getElementById("balloon-fx");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "balloon-fx";
    layer.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
    document.body.appendChild(layer);
  }

  const count = 4 + Math.floor(Math.random() * 3); // 4–6, dezent
  for (let i = 0; i < count; i++) {
    const [light, dark] = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const wrap = document.createElement("div");
    wrap.style.cssText =
      `position:fixed;left:${ox + (Math.random() * 2 - 1) * 12}px;top:${oy}px;will-change:transform,opacity`;

    const body = document.createElement("div");
    body.style.cssText =
      "width:14px;height:18px;border-radius:50% 50% 47% 47%;" +
      "box-shadow:inset -1.5px -2px 4px rgba(0,0,0,.16);" +
      `background:radial-gradient(circle at 33% 27%, rgba(255,255,255,.85), ${light} 42%, ${dark} 100%);` +
      `transform:scale(${(0.6 + Math.random() * 0.4).toFixed(2)})`;

    const str = document.createElement("div");
    str.style.cssText =
      "position:absolute;left:50%;top:100%;width:1px;height:10px;background:rgba(160,160,160,.5);transform:translateX(-50%)";
    body.appendChild(str);
    wrap.appendChild(body);
    layer.appendChild(wrap);

    const dx = (Math.random() * 2 - 1) * 70;
    const dy = -(140 + Math.random() * 130);
    const rot = (Math.random() * 2 - 1) * 32;
    const dur = 950 + Math.random() * 500;
    const swayX = dx * (0.35 + Math.random() * 0.3);

    const anim = wrap.animate(
      [
        { transform: "translate(-50%,-50%)", opacity: 0 },
        { offset: 0.15, opacity: 0.9, transform: `translate(-50%,-50%) translate(${swayX}px, ${dy * 0.14}px) rotate(${rot * 0.25}deg)` },
        { offset: 0.6, transform: `translate(-50%,-50%) translate(${dx * 1.1}px, ${dy * 0.62}px) rotate(${rot * 0.7}deg)` },
        { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }
    );
    anim.onfinish = () => wrap.remove();
  }
}

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
      const rawNext = params.get("next") || "/";
      // Defend against open redirects: only allow same-origin paths.
      const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
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
          <div className="order-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-2xl p-7 sm:p-8 border border-white/40 dark:border-zinc-800">
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
              Pfadiheim Baar
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
                        onClick={(e) => {
                          pickGroup(g);
                          if (STUFEN[g] === "pta") launchBalloons(e);
                        }}
                        style={STUFEN[g] === "pta" ? { backgroundImage: PTA_CONFETTI_BG } : undefined}
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
          <div className="order-1 text-white text-shadow-soft">
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

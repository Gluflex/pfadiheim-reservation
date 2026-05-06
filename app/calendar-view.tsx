"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ROOMS,
  STUFEN,
  STUFE_BLOCK,
  GROUP_COLORS,
  GROUP_MOTTOS,
  HOUR_START,
  HOUR_END,
  isAdmin,
  type Room,
  type Group,
} from "@/lib/constants";

type Reservation = {
  id: number;
  group_name: Group;
  room: Room;
  date: string; // YYYY-MM-DD
  start_hour: number;
  end_hour: number;
  note: string | null;
  created_at: string;
};

const HOURS: number[] = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const ZONE_BG_GRADIENT =
  "linear-gradient(to right, var(--zone-morning) 0%, var(--zone-morning) calc(4 / 13 * 100%), var(--zone-afternoon) calc(4 / 13 * 100%), var(--zone-afternoon) calc(9 / 13 * 100%), var(--zone-evening) calc(9 / 13 * 100%), var(--zone-evening) 100%)";

/** Hours that anchor the eye: noon (lunch), 14 (typical activity start), 17 (Z'Vieri / end). */
const ANCHOR_HOURS = new Set([12, 14, 17]);
/** The hour the standard Saturday activity tends to start — gets a tick. */
const PRIMARY_ANCHOR = 14;

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextSaturdays(count: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysUntilSat = (6 - dow + 7) % 7;
  const first = new Date(today);
  first.setDate(today.getDate() + daysUntilSat);
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + 7 * i);
    out.push(d);
  }
  return out;
}

function formatSatLabel(d: Date): string {
  return d.toLocaleDateString("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function CalendarView({ currentGroup }: { currentGroup: Group }) {
  const saturdays = useMemo(() => nextSaturdays(12), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(saturdays[0]));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingTarget, setBookingTarget] = useState<{ room: Room; startHour: number } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Reservation | null>(null);

  const fromDate = formatDateISO(saturdays[0]);
  const toDate = formatDateISO(saturdays[saturdays.length - 1]);

  async function loadReservations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations?from=${fromDate}&to=${toDate}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Laden fehlgeschlagen");
      const data = await res.json();
      setReservations(data.reservations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, [fromDate, toDate]);

  const reservationsForSelected = reservations.filter((r) => r.date === selectedDate);

  function reservationsForRoom(room: Room): Reservation[] {
    return reservationsForSelected.filter((r) => r.room === room).sort((a, b) => a.start_hour - b.start_hour);
  }

  function isHourBooked(room: Room, hour: number): Reservation | undefined {
    return reservationsForSelected.find(
      (r) => r.room === room && hour >= r.start_hour && hour < r.end_hour
    );
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const currentBlock = STUFE_BLOCK[STUFEN[currentGroup]];
  const adminUser = isAdmin(currentGroup);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-script text-3xl leading-none text-emerald-700 dark:text-emerald-400 select-none">
            Pfadi Baar
          </span>
          <span className="hidden sm:block h-6 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden="true" />
          <div className="hidden sm:flex items-baseline gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-display tracking-tight font-semibold text-zinc-900 dark:text-zinc-100">
              Pfadiheim
            </span>
            <span className="text-zinc-400">·</span>
            <span>
              eingeloggt als{" "}
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${currentBlock.bg} ${currentBlock.text}`}>
                {currentGroup}
              </span>
              {GROUP_MOTTOS[currentGroup] && (
                <span className="ml-2 italic text-zinc-500 dark:text-zinc-400">
                  {GROUP_MOTTOS[currentGroup]}
                </span>
              )}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
        >
          Abmelden
        </button>
      </header>

      {/* Saturday picker */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {saturdays.map((d) => {
            const iso = formatDateISO(d);
            const active = iso === selectedDate;
            const count = reservations.filter((r) => r.date === iso).length;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "bg-transparent text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {formatSatLabel(d)}
                {count > 0 && (
                  <span
                    className={`ml-2 inline-block min-w-[1.25rem] text-center text-xs rounded-full px-1.5 py-0.5 ${
                      active ? "bg-white/30 text-white" : "bg-emerald-700 text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl w-full mx-auto">
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Lade …</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Hour header */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                  <div className="w-32 shrink-0 px-3 py-2 text-[11px] uppercase tracking-wider font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800">
                    Raum
                  </div>
                  <div
                    className="flex-1 grid"
                    style={{
                      gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))`,
                      backgroundImage: ZONE_BG_GRADIENT,
                    }}
                  >
                    {HOURS.map((h) => {
                      const isAnchor = ANCHOR_HOURS.has(h);
                      const isPrimary = h === PRIMARY_ANCHOR;
                      return (
                        <div
                          key={h}
                          className={`text-center py-1.5 border-r last:border-r-0 ${
                            isAnchor
                              ? "border-zinc-300 dark:border-zinc-600"
                              : "border-zinc-200/50 dark:border-zinc-700/40"
                          }`}
                        >
                          <span
                            className={`block text-[11px] tabular-nums leading-tight ${
                              isPrimary
                                ? "font-bold text-emerald-700 dark:text-emerald-400"
                                : isAnchor
                                  ? "font-semibold text-zinc-800 dark:text-zinc-100"
                                  : "font-normal text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {String(h).padStart(2, "0")}
                          </span>
                          {isPrimary && (
                            <span className="block mx-auto mt-0.5 h-0.5 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rooms */}
                {ROOMS.map((room) => {
                  const roomReservations = reservationsForRoom(room);
                  return (
                    <div
                      key={room}
                      className="flex border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                    >
                      <div className="w-32 shrink-0 px-3 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 border-r border-zinc-200 dark:border-zinc-800 flex items-center">
                        {room}
                      </div>
                      <div
                        className="flex-1 relative grid"
                        style={{
                          gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))`,
                          minHeight: "60px",
                          backgroundImage: ZONE_BG_GRADIENT,
                        }}
                      >
                        {/* Empty hour cells (clickable to book) — transparent so zone tint shows.
                            All cells render right-borders so vertical gridlines run through every row. */}
                        {HOURS.map((h) => {
                          const booked = isHourBooked(room, h);
                          const isAnchor = ANCHOR_HOURS.has(h);
                          const borderClass = `border-r last:border-r-0 ${
                            isAnchor
                              ? "border-zinc-300/80 dark:border-zinc-600/60"
                              : "border-zinc-200/40 dark:border-zinc-700/30"
                          }`;
                          if (booked) return <div key={h} className={borderClass} aria-hidden="true" />;
                          return (
                            <button
                              key={h}
                              onClick={() => setBookingTarget({ room, startHour: h })}
                              className={`${borderClass} hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 transition-colors group relative`}
                              title={`${room} um ${String(h).padStart(2, "0")}:00 buchen`}
                            >
                              <span className="opacity-0 group-hover:opacity-100 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                                + Buchen
                              </span>
                            </button>
                          );
                        })}

                        {/* Booking blocks */}
                        {roomReservations.map((r) => {
                          const startCol = r.start_hour - HOUR_START;
                          const span = r.end_hour - r.start_hour;
                          const block = STUFE_BLOCK[STUFEN[r.group_name]];
                          const isOwn = r.group_name === currentGroup;
                          const canCancel = isOwn || adminUser;

                          const emphasis = isOwn
                            ? "shadow-md ring-1 ring-white/40 hover:ring-2 hover:ring-white cursor-pointer"
                            : adminUser
                              ? "shadow-sm opacity-90 hover:opacity-100 hover:ring-2 hover:ring-white/70 cursor-pointer"
                              : "opacity-75 cursor-default";

                          return (
                            <button
                              key={r.id}
                              onClick={() => canCancel && setConfirmCancel(r)}
                              className={`absolute top-1 bottom-1 ${block.bg} ${block.text} rounded-md px-2 py-1 text-xs font-semibold flex flex-col items-start justify-center overflow-hidden transition-all ${emphasis}`}
                              style={{
                                left: `calc(${(startCol / HOURS.length) * 100}% + 2px)`,
                                width: `calc(${(span / HOURS.length) * 100}% - 4px)`,
                              }}
                              title={
                                canCancel
                                  ? `${r.group_name} ${r.start_hour}:00–${r.end_hour}:00 (klicken zum Stornieren)`
                                  : `${r.group_name} ${r.start_hour}:00–${r.end_hour}:00${r.note ? ` · ${r.note}` : ""}`
                              }
                            >
                              <span className="truncate w-full">{r.group_name}</span>
                              <span className="text-[10px] font-normal opacity-90 tabular-nums">
                                {String(r.start_hour).padStart(2, "0")}–{String(r.end_hour).padStart(2, "0")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            Klicke auf eine freie Zelle, um zu reservieren.{" "}
            {adminUser ? (
              <>
                Als{" "}
                <span className={`inline-block px-1 rounded ${currentBlock.bg} ${currentBlock.text}`}>
                  {currentGroup}
                </span>{" "}
                kannst du jede Reservation stornieren.
              </>
            ) : (
              <>Klicke deine eigene Reservation, um sie zu stornieren.</>
            )}
          </p>
          <p>
            Bei Fragen:{" "}
            <a
              href="mailto:af@pfadibaar.ch"
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            >
              af@pfadibaar.ch
            </a>
          </p>
        </div>
      </main>

      {bookingTarget && (
        <BookingModal
          date={selectedDate}
          room={bookingTarget.room}
          initialStart={bookingTarget.startHour}
          existing={reservationsForRoom(bookingTarget.room)}
          onClose={() => setBookingTarget(null)}
          onCreated={() => {
            setBookingTarget(null);
            loadReservations();
          }}
        />
      )}

      {confirmCancel && (
        <CancelModal
          reservation={confirmCancel}
          onClose={() => setConfirmCancel(null)}
          onDeleted={() => {
            setConfirmCancel(null);
            loadReservations();
          }}
        />
      )}
    </div>
  );
}

function BookingModal({
  date,
  room,
  initialStart,
  existing,
  onClose,
  onCreated,
}: {
  date: string;
  room: Room;
  initialStart: number;
  existing: Reservation[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [startHour, setStartHour] = useState(initialStart);
  const [endHour, setEndHour] = useState(initialStart + 1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextBookingStart = existing
    .filter((r) => r.start_hour > startHour)
    .reduce<number>((min, r) => Math.min(min, r.start_hour), HOUR_END);

  const validEndHours = Array.from(
    { length: nextBookingStart - startHour },
    (_, i) => startHour + 1 + i
  ).filter((h) => h <= HOUR_END);

  const startHours = HOURS.filter((h) => {
    return !existing.some((r) => h >= r.start_hour && h < r.end_hour);
  });

  useEffect(() => {
    if (!validEndHours.includes(endHour)) {
      setEndHour(validEndHours[0] ?? startHour + 1);
    }
  }, [startHour]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          date,
          start_hour: startHour,
          end_hour: endHour,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Reservation fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold mb-1">Raum reservieren</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {room} — {new Date(date + "T00:00").toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Von</label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
            >
              {startHours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Bis</label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
            >
              {validEndHours.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notiz (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="z.B. Übung, Essen, …"
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={submit}
            disabled={submitting || validEndHours.length === 0}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium"
          >
            {submitting ? "Reserviere …" : "Reservieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  reservation,
  onClose,
  onDeleted,
}: {
  reservation: Reservation;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Suppress unused-import warning by making sure GROUP_COLORS stays referenced if needed in future.
  void GROUP_COLORS;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Stornierung fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold mb-2">Reservation stornieren?</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {reservation.room} am{" "}
          {new Date(reservation.date + "T00:00").toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "short" })}{" "}
          von {String(reservation.start_hour).padStart(2, "0")}:00 bis {String(reservation.end_hour).padStart(2, "0")}:00.
        </p>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm font-medium"
          >
            Behalten
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 text-white text-sm font-medium"
          >
            {submitting ? "Storniere …" : "Ja, stornieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

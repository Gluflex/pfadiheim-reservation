"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ROOMS,
  GROUP_COLORS,
  HOUR_START,
  HOUR_END,
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
  const dow = today.getDay(); // 0=Sun .. 6=Sat
  const daysUntilSat = (6 - dow + 7) % 7; // 0 if today is Sat
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Pfadiheim Reservation</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Eingeloggt als{" "}
            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${GROUP_COLORS[currentGroup].bg} ${GROUP_COLORS[currentGroup].text}`}>
              {currentGroup}
            </span>
          </p>
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
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {formatSatLabel(d)}
                {count > 0 && (
                  <span
                    className={`ml-2 inline-block min-w-[1.25rem] text-center text-xs rounded-full px-1.5 py-0.5 ${
                      active ? "bg-white/30" : "bg-emerald-600 text-white"
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
                  <div className="w-32 shrink-0 px-3 py-2 text-xs font-medium text-zinc-500 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
                    Raum
                  </div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
                    {HOURS.map((h) => (
                      <div key={h} className="text-xs text-zinc-500 text-center py-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0">
                        {String(h).padStart(2, "0")}
                      </div>
                    ))}
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
                      <div className="w-32 shrink-0 px-3 py-3 text-sm font-medium bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex items-center">
                        {room}
                      </div>
                      <div
                        className="flex-1 relative grid"
                        style={{
                          gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))`,
                          minHeight: "56px",
                        }}
                      >
                        {/* Empty hour cells (clickable to book) */}
                        {HOURS.map((h) => {
                          const booked = isHourBooked(room, h);
                          if (booked) {
                            return (
                              <div
                                key={h}
                                className="border-r border-zinc-100 dark:border-zinc-800 last:border-r-0"
                              />
                            );
                          }
                          return (
                            <button
                              key={h}
                              onClick={() => setBookingTarget({ room, startHour: h })}
                              className="border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors group"
                              title={`${room} um ${String(h).padStart(2, "0")}:00 buchen`}
                            >
                              <span className="opacity-0 group-hover:opacity-100 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                + Buchen
                              </span>
                            </button>
                          );
                        })}

                        {/* Booking blocks (absolute over the grid) */}
                        {roomReservations.map((r) => {
                          const startCol = r.start_hour - HOUR_START;
                          const span = r.end_hour - r.start_hour;
                          const c = GROUP_COLORS[r.group_name];
                          const isOwn = r.group_name === currentGroup;
                          return (
                            <button
                              key={r.id}
                              onClick={() => isOwn && setConfirmCancel(r)}
                              className={`absolute top-1 bottom-1 ${c.bg} ${c.text} rounded-md px-2 py-1 text-xs font-medium shadow-sm flex flex-col items-start justify-center overflow-hidden ${
                                isOwn ? "cursor-pointer hover:ring-2 ring-offset-1 dark:ring-offset-zinc-900 " + c.ring : "cursor-default"
                              }`}
                              style={{
                                left: `calc(${(startCol / HOURS.length) * 100}% + 2px)`,
                                width: `calc(${(span / HOURS.length) * 100}% - 4px)`,
                              }}
                              title={
                                isOwn
                                  ? `${r.group_name} ${r.start_hour}:00–${r.end_hour}:00 (klicken zum Stornieren)`
                                  : `${r.group_name} ${r.start_hour}:00–${r.end_hour}:00`
                              }
                            >
                              <span className="truncate w-full">{r.group_name}</span>
                              <span className="text-[10px] opacity-90">
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

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
          Klicke auf eine freie Zelle, um zu reservieren. Klicke auf eine deiner Reservationen (
          <span className={`inline-block px-1 rounded ${GROUP_COLORS[currentGroup].bg} ${GROUP_COLORS[currentGroup].text}`}>
            {currentGroup}
          </span>
          ), um sie zu stornieren.
        </p>
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

  // For a chosen startHour, the maximum endHour is bounded by the next existing booking.
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
        <h2 className="text-lg font-semibold mb-1">Raum reservieren</h2>
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
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-sm font-medium"
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
        <h2 className="text-lg font-semibold mb-2">Reservation stornieren?</h2>
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

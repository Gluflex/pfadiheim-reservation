import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureSchema, sql, type ReservationRow } from "@/lib/db";
import { isRoom, HOUR_START, HOUR_END } from "@/lib/constants";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  await ensureSchema();
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Invalid or missing 'from'/'to' (YYYY-MM-DD)" }, { status: 400 });
  }
  const rows = await sql<ReservationRow[]>`
    SELECT id, group_name, room, to_char(date, 'YYYY-MM-DD') AS date,
           start_hour, end_hour, note, created_at
    FROM reservations
    WHERE date >= ${from} AND date <= ${to}
    ORDER BY date, room, start_hour
  `;
  return NextResponse.json({ reservations: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { room, date, start_hour, end_hour, note } = (body ?? {}) as {
    room?: unknown;
    date?: unknown;
    start_hour?: unknown;
    end_hour?: unknown;
    note?: unknown;
  };

  if (!isRoom(room)) {
    return NextResponse.json({ error: "Ungültiger Raum" }, { status: 400 });
  }
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Datum muss YYYY-MM-DD sein" }, { status: 400 });
  }
  if (
    typeof start_hour !== "number" ||
    typeof end_hour !== "number" ||
    !Number.isInteger(start_hour) ||
    !Number.isInteger(end_hour) ||
    start_hour < HOUR_START ||
    end_hour > HOUR_END ||
    end_hour <= start_hour
  ) {
    return NextResponse.json(
      { error: `Zeitfenster muss zwischen ${HOUR_START}:00 und ${HOUR_END}:00 liegen, mit end > start` },
      { status: 400 }
    );
  }
  const noteStr = typeof note === "string" && note.trim().length > 0 ? note.trim().slice(0, 200) : null;

  await ensureSchema();

  // The DB enforces overlap prevention atomically via the
  // `reservations_no_overlap` EXCLUDE constraint set up in ensureSchema.
  // We still ship the WHERE NOT EXISTS check as a fast path so the common case
  // returns a clean 409 without raising an exception.
  let inserted: ReservationRow[];
  try {
    inserted = await sql<ReservationRow[]>`
      INSERT INTO reservations (group_name, room, date, start_hour, end_hour, note)
      SELECT ${session.group}, ${room}, ${date}::date, ${start_hour}, ${end_hour}, ${noteStr}
      WHERE NOT EXISTS (
        SELECT 1 FROM reservations
        WHERE room = ${room}
          AND date = ${date}::date
          AND start_hour < ${end_hour}
          AND end_hour > ${start_hour}
      )
      RETURNING id, group_name, room, to_char(date, 'YYYY-MM-DD') AS date,
                start_hour, end_hour, note, created_at
    `;
  } catch (err) {
    const msg = String(err);
    // Postgres exclusion constraint violation (SQLSTATE 23P01) — race lost.
    if (msg.includes("23P01") || msg.includes("reservations_no_overlap")) {
      return NextResponse.json(
        { error: "Dieser Raum ist zu dieser Zeit bereits reserviert." },
        { status: 409 }
      );
    }
    throw err;
  }

  if (inserted.length === 0) {
    return NextResponse.json(
      { error: "Dieser Raum ist zu dieser Zeit bereits reserviert." },
      { status: 409 }
    );
  }

  return NextResponse.json({ reservation: inserted[0] }, { status: 201 });
}

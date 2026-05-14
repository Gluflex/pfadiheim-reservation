import postgres, { type Sql } from "postgres";
import { unstable_cache } from "next/cache";

declare global {
  var __pfadiSql: Sql | undefined;
  var __pfadiSchemaReady: Promise<void> | undefined;
}

function makeClient(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    ssl: url.includes("localhost") ? false : "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export function getSql(): Sql {
  if (!global.__pfadiSql) {
    global.__pfadiSql = makeClient();
  }
  return global.__pfadiSql;
}

// Proxy that forwards tagged-template calls to the lazily-created client.
export const sql: Sql = new Proxy(((..._args: unknown[]) => undefined) as unknown as Sql, {
  apply(_t, _thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_t, prop, _r) {
    return Reflect.get(getSql() as unknown as object, prop);
  },
}) as Sql;

export async function ensureSchema(): Promise<void> {
  if (!global.__pfadiSchemaReady) {
    global.__pfadiSchemaReady = (async () => {
      const s = getSql();
      await s`
        CREATE TABLE IF NOT EXISTS reservations (
          id          SERIAL PRIMARY KEY,
          group_name  TEXT NOT NULL,
          room        TEXT NOT NULL,
          date        DATE NOT NULL,
          start_hour  INTEGER NOT NULL,
          end_hour    INTEGER NOT NULL,
          note        TEXT,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CHECK (start_hour >= 0 AND start_hour < 24),
          CHECK (end_hour > start_hour AND end_hour <= 24)
        )
      `;
      await s`CREATE INDEX IF NOT EXISTS reservations_room_date_idx ON reservations (room, date)`;
      await s`CREATE INDEX IF NOT EXISTS reservations_date_idx ON reservations (date)`;

      // Exclusion constraint: atomically prevents overlapping bookings for the
      // same (room, date). Without this, the WHERE NOT EXISTS check in the
      // INSERT is vulnerable to races between concurrent requests.
      await s`CREATE EXTENSION IF NOT EXISTS btree_gist`;
      try {
        await s`
          ALTER TABLE reservations
          ADD CONSTRAINT reservations_no_overlap
          EXCLUDE USING gist (
            room WITH =,
            date WITH =,
            int4range(start_hour, end_hour) WITH &&
          )
        `;
      } catch (err) {
        // Ignore "already exists" — running twice is fine.
        const msg = String(err);
        if (!msg.includes("already exists") && !msg.includes("42710")) throw err;
      }

      // Login attempt log used by the rate-limiter on /api/login.
      await s`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id            BIGSERIAL PRIMARY KEY,
          ip            TEXT NOT NULL,
          group_name    TEXT NOT NULL,
          succeeded     BOOLEAN NOT NULL,
          attempted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await s`
        CREATE INDEX IF NOT EXISTS login_attempts_ip_time_idx
        ON login_attempts (ip, attempted_at)
      `;
    })().catch((err) => {
      global.__pfadiSchemaReady = undefined;
      throw err;
    });
  }
  return global.__pfadiSchemaReady;
}

export type ReservationRow = {
  id: number;
  group_name: string;
  room: string;
  date: string;
  start_hour: number;
  end_hour: number;
  note: string | null;
  created_at: string;
};

export const RESERVATIONS_CACHE_TAG = "reservations";

// Cached window query — serves stale data instantly so the user never waits on
// Neon's cold-start wake-up. Writes call revalidateTag(RESERVATIONS_CACHE_TAG)
// to invalidate. Revalidate also runs every 60s as a safety net.
export const getReservationsForWindow = unstable_cache(
  async (from: string, to: string): Promise<ReservationRow[]> => {
    await ensureSchema();
    const rows = await sql<ReservationRow[]>`
      SELECT id, group_name, room, to_char(date, 'YYYY-MM-DD') AS date,
             start_hour, end_hour, note, created_at
      FROM reservations
      WHERE date >= ${from} AND date <= ${to}
      ORDER BY date, room, start_hour
    `;
    return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
  },
  ["reservations-window"],
  { revalidate: 60, tags: [RESERVATIONS_CACHE_TAG] }
);

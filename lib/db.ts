import postgres, { type Sql } from "postgres";

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
// This lets callers write `sql\`SELECT ...\`` without importing getSql() first.
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

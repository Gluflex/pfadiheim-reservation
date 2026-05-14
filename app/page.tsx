import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getReservationsForWindow } from "@/lib/db";
import type { Group, Room } from "@/lib/constants";
import CalendarView from "./calendar-view";

export const dynamic = "force-dynamic";

function zurichTodayParts(): { y: number; m: number; d: number } {
  // en-CA always renders YYYY-MM-DD, regardless of locale settings.
  const iso = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function nextSaturdayIsoDates(count: number): string[] {
  const { y, m, d } = zurichTodayParts();
  const base = new Date(Date.UTC(y, m - 1, d));
  const daysUntilSat = (6 - base.getUTCDay() + 7) % 7;
  base.setUTCDate(base.getUTCDate() + daysUntilSat);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const sat = new Date(base);
    sat.setUTCDate(base.getUTCDate() + 7 * i);
    out.push(`${sat.getUTCFullYear()}-${pad(sat.getUTCMonth() + 1)}-${pad(sat.getUTCDate())}`);
  }
  return out;
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const saturdays = nextSaturdayIsoDates(12);
  const rows = await getReservationsForWindow(
    saturdays[0],
    saturdays[saturdays.length - 1]
  );
  // DB strings → narrowed types. Group/Room values are enforced at write time
  // (POST validates via isRoom; login restricts group_name to GROUPS).
  const initialReservations = rows.map((r) => ({
    ...r,
    group_name: r.group_name as Group,
    room: r.room as Room,
  }));
  return (
    <CalendarView
      currentGroup={session.group}
      initialReservations={initialReservations}
      saturdayIsoDates={saturdays}
    />
  );
}

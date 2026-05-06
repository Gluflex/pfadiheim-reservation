import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureSchema, sql, type ReservationRow } from "@/lib/db";
import { isAdmin } from "@/lib/constants";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await ctx.params;
  const idNum = Number.parseInt(id, 10);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
  }

  await ensureSchema();

  const deleted = isAdmin(session.group)
    ? await sql<ReservationRow[]>`
        DELETE FROM reservations
        WHERE id = ${idNum}
        RETURNING id
      `
    : await sql<ReservationRow[]>`
        DELETE FROM reservations
        WHERE id = ${idNum} AND group_name = ${session.group}
        RETURNING id
      `;

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Reservation nicht gefunden oder nicht deine Gruppe." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}

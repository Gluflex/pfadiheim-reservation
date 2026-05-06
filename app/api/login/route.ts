import { NextResponse } from "next/server";
import { createSession, verifyGroupPassword } from "@/lib/auth";
import { getClientIp, isLoginRateLimited, recordLoginAttempt } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (await isLoginRateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte 15 Minuten warten und dann erneut versuchen." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { group, password } = (body ?? {}) as { group?: unknown; password?: unknown };
  if (typeof group !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing group or password" }, { status: 400 });
  }

  const verified = await verifyGroupPassword(group, password);
  await recordLoginAttempt(ip, group, !!verified);

  if (!verified) {
    return NextResponse.json({ error: "Falsche Gruppe oder falsches Passwort" }, { status: 401 });
  }
  await createSession(verified);
  return NextResponse.json({ ok: true, group: verified });
}

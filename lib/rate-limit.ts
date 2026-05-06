import { ensureSchema, sql } from "./db";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 10;

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Returns true if this IP has been blocked due to too many recent failed
 * login attempts. Counts only failures in the last WINDOW_MINUTES.
 */
export async function isLoginRateLimited(ip: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM login_attempts
    WHERE ip = ${ip}
      AND succeeded = FALSE
      AND attempted_at > NOW() - (${WINDOW_MINUTES}::text || ' minutes')::interval
  `;
  const count = Number.parseInt(rows[0]?.count ?? "0", 10);
  return count >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string, group: string, succeeded: boolean): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO login_attempts (ip, group_name, succeeded)
    VALUES (${ip}, ${group}, ${succeeded})
  `;
  // On a successful login, clear this IP's history so subsequent legitimate
  // logins aren't blocked by stale failures.
  if (succeeded) {
    await sql`DELETE FROM login_attempts WHERE ip = ${ip} AND succeeded = FALSE`;
  }
  // Opportunistic cleanup of rows older than 24h, runs ~1% of the time.
  if (Math.random() < 0.01) {
    await sql`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'`;
  }
}

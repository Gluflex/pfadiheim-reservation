import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { GROUPS, type Group, isGroup } from "./constants";

const COOKIE_NAME = "pf_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is not set or too short (min 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

function getGroupHashes(): Record<string, string> {
  const raw = process.env.GROUP_PASSWORDS_JSON;
  if (!raw) throw new Error("GROUP_PASSWORDS_JSON is not set");
  // Try base64 first (recommended — bcrypt hashes contain '$' which Vercel
  // interprets as a variable reference and mangles). Fall back to raw JSON.
  let candidate = raw.trim();
  if (!candidate.startsWith("{")) {
    try {
      candidate = Buffer.from(candidate, "base64").toString("utf8");
    } catch {
      // leave as-is, JSON.parse will throw below
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("GROUP_PASSWORDS_JSON is not valid JSON (paste base64 of the JSON to avoid Vercel '$' expansion)");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("GROUP_PASSWORDS_JSON must be an object");
  }
  return parsed as Record<string, string>;
}

export async function verifyGroupPassword(group: string, password: string): Promise<Group | null> {
  if (!isGroup(group)) return null;
  const hashes = getGroupHashes();
  const hash = hashes[group];
  if (!hash) return null;
  const ok = await bcrypt.compare(password, hash);
  return ok ? group : null;
}

export async function createSession(group: Group): Promise<void> {
  const token = await new SignJWT({ group })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getJwtSecret());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ group: Group } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const group = payload.group;
    if (typeof group === "string" && isGroup(group)) {
      return { group };
    }
    return null;
  } catch {
    return null;
  }
}

export function listGroups(): readonly Group[] {
  return GROUPS;
}

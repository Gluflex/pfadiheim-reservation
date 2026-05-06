/**
 * Generates bcrypt hashes for the 11 group passwords and prints them as a JSON
 * blob suitable for the GROUP_PASSWORDS_JSON env var.
 *
 * Usage:
 *   npx tsx scripts/hash-passwords.ts                          # generate random passphrases
 *   npx tsx scripts/hash-passwords.ts --stdin < passwords.txt  # read one password per line, in GROUPS order
 */
import bcrypt from "bcryptjs";
import { GROUPS } from "../lib/constants";
import { readFileSync } from "node:fs";

const ADJECTIVES = [
  "schnell", "leise", "wild", "stark", "klug", "froh", "frech", "treu",
  "mutig", "fein", "klar", "weit", "hoch", "tief", "warm", "kalt",
];
const NOUNS = [
  "Berg", "Tal", "Wald", "See", "Stern", "Mond", "Feuer", "Wind",
  "Pfad", "Knoten", "Zelt", "Stab", "Lager", "Funke", "Adler", "Wolf",
];
const ANIMALS = [
  "Fuchs", "Luchs", "Otter", "Eule", "Hirsch", "Reh", "Bär", "Falke",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePassphrase(): string {
  const num = Math.floor(Math.random() * 90) + 10;
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(ANIMALS)}-${num}`;
}

async function main() {
  const useStdin = process.argv.includes("--stdin");
  let plaintexts: string[];

  if (useStdin) {
    const input = readFileSync(0, "utf8");
    plaintexts = input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (plaintexts.length !== GROUPS.length) {
      console.error(
        `Expected ${GROUPS.length} passwords on stdin (one per line in GROUPS order), got ${plaintexts.length}.`
      );
      process.exit(1);
    }
  } else {
    plaintexts = GROUPS.map(() => generatePassphrase());
  }

  const hashes: Record<string, string> = {};
  for (let i = 0; i < GROUPS.length; i++) {
    const group = GROUPS[i];
    const password = plaintexts[i];
    const hash = await bcrypt.hash(password, 10);
    hashes[group] = hash;
  }

  console.error("\n=== Passwords (give one to each group, then DELETE this output) ===");
  for (let i = 0; i < GROUPS.length; i++) {
    console.error(`  ${GROUPS[i].padEnd(12)} -> ${plaintexts[i]}`);
  }
  console.error("\n=== GROUP_PASSWORDS_JSON env var (copy whole line below) ===\n");
  console.log(JSON.stringify(hashes));
  console.error("\n=== JWT_SECRET suggestion (copy this too) ===");
  console.error(`  ${randomSecret(48)}`);
  console.error("");
}

function randomSecret(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

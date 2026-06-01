/**
 * Adds one or more new groups to an existing GROUP_PASSWORDS_JSON blob:
 * generates a fresh passphrase per group, bcrypt-hashes it, merges into the
 * existing base64-encoded blob, and prints the new base64 plus each plaintext.
 *
 * Usage:
 *   npx tsx scripts/add-groups.ts <existing-base64-blob> <Group1,Group2,...>
 *
 * Example:
 *   npx tsx scripts/add-groups.ts eyJ...== "Biberli,Wölfli,PTA,Pios"
 */
import bcrypt from "bcryptjs";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const ADJECTIVES = ["schnell", "leise", "wild", "stark", "klug", "froh", "frech", "treu", "mutig", "fein", "klar", "weit", "hoch", "tief", "warm", "kalt"];
const NOUNS = ["Berg", "Tal", "Wald", "See", "Stern", "Mond", "Feuer", "Wind", "Pfad", "Knoten", "Zelt", "Stab", "Lager", "Funke", "Adler", "Wolf"];
const ANIMALS = ["Fuchs", "Luchs", "Otter", "Eule", "Hirsch", "Reh", "Bär", "Falke"];

function generatePassphrase(): string {
  const num = Math.floor(Math.random() * 90) + 10;
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(ANIMALS)}-${num}`;
}

async function main() {
  const existingB64 = process.argv[2];
  const groupsArg = process.argv[3];
  if (!existingB64 || !groupsArg) {
    console.error("Usage: npx tsx scripts/add-groups.ts <existing-base64-blob> <Group1,Group2,...>");
    process.exit(1);
  }

  const json = Buffer.from(existingB64, "base64").toString("utf8");
  const obj: Record<string, string> = JSON.parse(json);

  const groups = groupsArg.split(",").map((g) => g.trim()).filter(Boolean);
  const plaintexts: Record<string, string> = {};

  for (const group of groups) {
    if (obj[group]) {
      console.error(`WARNING: '${group}' already exists in the blob — overwriting with a new password.`);
    }
    const password = generatePassphrase();
    obj[group] = await bcrypt.hash(password, 10);
    plaintexts[group] = password;
  }

  const newB64 = Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

  console.error("\n=== New passwords (record these in the secrets file, then DELETE this output) ===");
  for (const group of groups) {
    console.error(`  ${group.padEnd(12)} -> ${plaintexts[group]}`);
  }
  console.error("\n=== Updated GROUP_PASSWORDS_JSON value (paste into Vercel, then Redeploy) ===\n");
  console.log(newB64);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

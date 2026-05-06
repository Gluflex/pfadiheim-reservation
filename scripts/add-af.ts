/**
 * One-off helper: generates a fresh AF (admin) password, merges it into the
 * existing GROUP_PASSWORDS_JSON (passed as the first arg, base64-encoded),
 * and prints the new base64 plus the AF plaintext password.
 *
 * Usage:
 *   npx tsx scripts/add-af.ts <existing-base64-blob>
 */
import bcrypt from "bcryptjs";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const ADJECTIVES = ["schnell", "leise", "wild", "stark", "klug", "froh", "frech", "treu", "mutig", "fein", "klar", "weit", "hoch", "tief", "warm", "kalt"];
const NOUNS = ["Berg", "Tal", "Wald", "See", "Stern", "Mond", "Feuer", "Wind", "Pfad", "Knoten", "Zelt", "Stab", "Lager", "Funke", "Adler", "Wolf"];
const ANIMALS = ["Fuchs", "Luchs", "Otter", "Eule", "Hirsch", "Reh", "Bär", "Falke"];

async function main() {
  const existingB64 = process.argv[2];
  if (!existingB64) {
    console.error("Usage: npx tsx scripts/add-af.ts <existing-base64-blob>");
    process.exit(1);
  }

  const json = Buffer.from(existingB64, "base64").toString("utf8");
  const obj: Record<string, string> = JSON.parse(json);

  const password = `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(ANIMALS)}-${Math.floor(Math.random() * 90) + 10}`;
  const hash = await bcrypt.hash(password, 10);
  obj.AF = hash;

  const newJson = JSON.stringify(obj);
  const newB64 = Buffer.from(newJson, "utf8").toString("base64");

  console.error(`\nAF password: ${password}`);
  console.error(`\nNew GROUP_PASSWORDS_JSON value (paste into Vercel):\n`);
  console.log(newB64);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

# Pfadiheim Reservation

A simple, mobile-friendly reservation tool for the scout home. Each Pfadi group
logs in with its own password and books rooms (Actionraum, Chillerraum, Grosser
Saal, Küche, Wiese) on upcoming Saturdays in hour-granularity time slots.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Postgres (Vercel/Neon) for persistence
- bcryptjs + jose (JWT sessions in HTTP-only cookies)
- Deployed on Vercel

## One-time deploy (do this once)

You'll do five things in your browser. The code is ready.

### 1. Push the repo to GitHub

1. Go to <https://github.com/new>, create an empty repo named `pfadiheim-reservation`
   (private is fine). **Do NOT** check "Initialize with README".
2. Copy the repo URL (e.g. `https://github.com/<you>/pfadiheim-reservation.git`).
3. Add the remote and push:
   ```bash
   git remote add origin https://github.com/<you>/pfadiheim-reservation.git
   git branch -M main
   git push -u origin main
   ```

### 2. Import into Vercel

1. Go to <https://vercel.com/new>, click "Import Git Repository", pick the repo.
2. Framework preset: **Next.js** (auto-detected). Leave everything default.
3. Click **Deploy**. The first deploy will fail because env vars aren't set yet — that's expected.

### 3. Add a Postgres database

1. In your Vercel project dashboard, go to the **Storage** tab.
2. Click **Create Database** → choose **Neon (Serverless Postgres)** from the
   marketplace (free tier).
3. Click through the defaults and **Connect** it to the project.
4. Vercel automatically injects `DATABASE_URL` (and `POSTGRES_*` aliases) into the project.

### 4. Generate passwords + secrets

On your machine, in the project folder, run:

```bash
npx tsx scripts/hash-passwords.ts
```

This prints:
- 11 random memorable passwords (one per group) — distribute these to the groups
- A `GROUP_PASSWORDS_JSON` blob — paste into Vercel
- A `JWT_SECRET` — paste into Vercel

If you'd rather choose your own passwords, write them to a file (one per line,
in the order: Grizzly, Widder, Sperber, Specht, Tiger, Flamingo, Kobra, Kondor,
Moskito, Flädermuus, Marabu) and pipe it:

```bash
npx tsx scripts/hash-passwords.ts --stdin < passwords.txt
```

### 5. Add env vars in Vercel

In the Vercel project → **Settings** → **Environment Variables**, add (apply to
all environments — Production, Preview, Development):

| Name                   | Value                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `JWT_SECRET`           | The random string the script printed                                                 |
| `GROUP_PASSWORDS_JSON` | The JSON blob the script printed (the line starting with `{"Grizzly":"$2a$10$..."}`) |

`DATABASE_URL` is already set by step 3.

Then go to **Deployments** → click the latest one → **Redeploy** (without cache).

### 6. Test

Open the production URL, log in as any group with its password, and book a slot.
Refresh — the booking persists. Try double-booking the same slot — the server rejects.

The DB schema is created automatically on first request (`ensureSchema`).

---

## Local development

```bash
cp .env.example .env.local
# Fill in DATABASE_URL (use the Neon connection string from Vercel),
# JWT_SECRET, and GROUP_PASSWORDS_JSON.
npm install
npm run dev
```

Open <http://localhost:3000>.

## Project structure

```
app/
  layout.tsx                       Root layout
  page.tsx                         Home (calendar) — server, redirects to /login if not authed
  calendar-view.tsx                Client component: schedule grid + modals
  login/page.tsx                   Login page
  api/
    login/route.ts                 POST  — group + password → session cookie
    logout/route.ts                POST  — clears cookie
    session/route.ts               GET   — current session
    reservations/route.ts          GET   — list in date range
                                   POST  — create (conflict-checked)
    reservations/[id]/route.ts     DELETE — cancel own booking
lib/
  constants.ts                     GROUPS, ROOMS, GROUP_COLORS, hour bounds
  db.ts                            postgres client + ensureSchema()
  auth.ts                          JWT session helpers, password verify
scripts/
  hash-passwords.ts                Generate passphrases + bcrypt hashes
```

## Operational notes

- **Adding/removing groups:** edit `lib/constants.ts` and re-run the password
  script with the new group list, then update `GROUP_PASSWORDS_JSON` in Vercel.
- **Rotating a single group's password:** edit only that group's entry in the
  JSON env var (replace the bcrypt hash). The script can also be edited to
  hash a single password if needed.
- **No admin override:** by design, only the booking group can cancel its own
  booking. To delete someone else's booking, edit the row in the Neon dashboard
  (Storage tab in Vercel → "Open in Neon Console" → Tables → `reservations`).
- **Conflict policy:** strictly one group per room per overlapping hour range.
  Enforced server-side via `WHERE NOT EXISTS` on insert.
- **Time bounds:** 08:00–21:00, hour granularity. Edit `HOUR_START`/`HOUR_END`
  in `lib/constants.ts` to change.

## Security notes

- Passwords are bcrypt-hashed (cost 10), never stored in plaintext.
- Sessions are signed JWTs in HTTP-only `Secure` `SameSite=Lax` cookies, 30-day
  expiry.
- The session is server-side validated on every API call.
- No public registration, no password reset flow — by design (small closed group
  of users; rotate via env var).

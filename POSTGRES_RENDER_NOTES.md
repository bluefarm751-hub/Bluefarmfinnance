# BlueFarm Finance — Render + PostgreSQL

This version is prepared for deployment as the existing Render Node web service with PostgreSQL.

## Required Render environment variables

- `DATABASE_URL` — your Render PostgreSQL connection string.
- `NODE_ENV=production` — recommended.
- `CORS_ORIGIN` — optional. Leave unset when the frontend is served by the same Node service; set it only when you intentionally allow a separate frontend origin.

## Deployment

Render should run:

Build:
`npm install --prefix server && npm install --prefix client && npm run build --prefix client`

Start:
`npm start --prefix server`

Health check:
`/health`

The server waits for all PostgreSQL tables to initialize before listening on the Render port.

## Database

The application uses PostgreSQL via `DATABASE_URL`. SQLite is not used by the production application.

This code creates missing tables but does not copy data from an old SQLite database. If old SQLite records must be preserved, perform a one-time data migration into the PostgreSQL database before switching production traffic.

## Backups

`server/utils/backupPostgres.js` runs automatically — a full JSON snapshot
of every table, gzipped, is taken shortly after the server starts and then
every 6 hours for as long as it keeps running. This does **not** require
the `pg_dump` binary to be present.

For the backup to actually survive a redeploy/restart, Cloudinary must be
configured (see below) — the backup module uploads each snapshot there as
a `raw` file under `bluefarm/backups/`. **Without Cloudinary configured,
backups are only written to local disk and are wiped on the next
redeploy/restart, just like the old uploads problem.** Old backups are
pruned automatically (last 60 kept in Cloudinary, last 20 kept locally).

Two admin-only endpoints exist to check on this:
- `GET /api/admin/backup-status` — when the last backup ran, whether it
  succeeded, and whether backups are actually durable right now.
- `POST /api/admin/backup-run` — trigger an immediate backup on demand
  (e.g. right before a risky bulk edit).

Restoring: download the `.json.gz` file from Cloudinary, gunzip it, and
re-insert the rows — it's plain JSON keyed by table name (`{"tables":
{"employees": [...], "payroll": [...], ...}}`), not a proprietary format.

The `users` table (which holds password hashes) is deliberately excluded
from these backups. If admin accounts are ever lost, recreate them with
`node server/database/resetPasswords.js`.

Render's own managed PostgreSQL backups (if you're on a paid plan) are a
good additional safety net on top of this, not a replacement for it.

## Uploaded documents

Employee documents and bill pictures now use persistent cloud storage
(Cloudinary) when configured — see "Persistent file storage" below. This
replaces the previous local-disk approach, which was silently wiped on
every Render redeploy/restart on the free plan (the cause of bill
pictures returning 404 after being added). If Cloudinary is not
configured, the app automatically falls back to local disk exactly as
before, so nothing breaks — but files will still be lost on redeploy
until you set it up.

## Persistent file storage (Cloudinary) — fixes the "bill picture 404" issue, and makes backups durable

1. Create a free account at https://cloudinary.com (free tier is plenty
   for this use case).
2. From your Cloudinary dashboard, copy the **Cloud Name**, **API Key**,
   and **API Secret**.
3. In the Render dashboard, open this service → **Environment** → add:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Redeploy. New uploads (employee photos, CNIC copies, police
   verification, bill pictures) will now be stored on Cloudinary and will
   survive redeploys/restarts — and so will your database backups (see
   "Backups" above).

Note: this does **not** retroactively fix files that were already lost
before these variables were set — only new uploads made after
configuring Cloudinary are persistent. Any bill/employee record still
pointing at an old local `/uploads/...` path that's already gone will
need the file re-uploaded once.

## Security

Default accounts are created with hashed passwords, but the passwords
themselves are still the well-known defaults from `initDatabase.js` /
`resetPasswords.js` (`admin123`, `acct123`, `bluefarm123`, `remounts123`).
**Change every one of these immediately after the first production
login** — anyone who has ever seen this codebase knows them. There is
currently no forced-password-change flow, so this is a manual step you
must not skip.

Other things worth knowing:
- Only two roles exist: `admin` (full access) and `farm` (Employees +
  Report Info only — Finance/Cash Book/Ledger/Payroll are blocked both in
  the UI and now on the server via `requireAdmin`).
- Sessions live in server memory and expire after 12 hours of inactivity;
  restarting the server logs everyone out (expected for this app's size).
- Login is rate-limited per IP+username (8 attempts / 15 minutes).
- Never commit production credentials (`DATABASE_URL`, `CLOUDINARY_*`) to
  GitHub — set them as environment variables in the Render dashboard only.
- CORS is locked to same-origin in production unless `CORS_ORIGIN` is
  explicitly set — you shouldn't need to set it for the normal setup
  where this one server serves both the API and the built React app.

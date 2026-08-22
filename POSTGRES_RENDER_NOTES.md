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

`server/utils/backupPostgres.js` provides an optional `pg_dump` helper. Do not depend on the web-service filesystem for permanent backups. Prefer Render/provider-managed PostgreSQL backups or an offsite backup destination.

## Uploaded documents

Employee documents and bill pictures now use persistent cloud storage
(Cloudinary) when configured — see "Persistent file storage" below. This
replaces the previous local-disk approach, which was silently wiped on
every Render redeploy/restart on the free plan (the cause of bill
pictures returning 404 after being added). If Cloudinary is not
configured, the app automatically falls back to local disk exactly as
before, so nothing breaks — but files will still be lost on redeploy
until you set it up.

## Persistent file storage (Cloudinary) — fixes the "bill picture 404" issue

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
   survive redeploys/restarts.

Note: this does **not** retroactively fix files that were already lost
before these variables were set — only new uploads made after
configuring Cloudinary are persistent. Any bill/employee record still
pointing at an old local `/uploads/...` path that's already gone will
need the file re-uploaded once.

## Security

Default accounts are created with hashed passwords. Change the default passwords immediately after the first production login and never commit production credentials to GitHub.

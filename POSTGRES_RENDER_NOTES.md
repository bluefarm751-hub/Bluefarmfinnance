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

Employee documents are currently stored under `/uploads`. Render web-service storage should not be treated as permanent storage. For production, use a persistent disk or object storage and update the upload layer accordingly.

## Security

Default accounts are created with hashed passwords. Change the default passwords immediately after the first production login and never commit production credentials to GitHub.

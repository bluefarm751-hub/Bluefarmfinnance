# Blue Farm Finance System — Cloud-Ready Package

## Important
Your original application code and database design have NOT been replaced.
This package only adds cloud-hosting support around the existing software.

### Changes made
- Server now uses the hosting provider's `PORT` environment variable.
- Added `/health` endpoint for hosting health checks.
- CORS can be controlled with `CORS_ORIGIN`.
- SQLite database path can be controlled with `DB_PATH`.
- Added production `start` and `build` scripts.
- Added `render.yaml` for deployment setup.
- Existing React pages, API routes, login, payroll, finance, cashbook, ledger, employees and document handling are preserved.

## Very important about FREE hosting
The included Render configuration uses `/tmp/bluefarm.db` only as a SAFE TEST/DEMO configuration.
Free web hosting storage can be temporary. Do NOT put important financial records online with this SQLite configuration until a persistent database/storage solution is added.

For real production financial data, the next step should be:
1. Keep this package as the untouched backup.
2. Add a persistent PostgreSQL database (or another persistent database).
3. Migrate the existing SQLite data into it.
4. Test login, employees, payroll, finance, cashbook, ledger, documents and backups.
5. Only then switch the live system to real financial records.

## Local use
Your existing local workflow remains available. The software still uses SQLite by default when `DB_PATH` is not set.

## Deployment
Use the included `render.yaml` to create the service. For testing, it will launch the application online.

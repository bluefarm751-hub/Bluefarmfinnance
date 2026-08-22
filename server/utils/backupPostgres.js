// Automated, off-server backups of the live PostgreSQL database.
//
// WHY THIS EXISTS: this app previously had two backup scripts sitting in
// the codebase (a SQLite one referencing a database file that no longer
// exists, and a pg_dump wrapper) — but NEITHER was ever actually called
// from server.js. In practice there was NO backup running at all: if the
// Postgres database were ever lost, corrupted, or a bad delete happened,
// there was nothing to restore from.
//
// This module takes a full JSON snapshot of every table (via the existing
// `pg` connection — no external pg_dump binary required, since that may
// not exist in Render's Node build image), gzips it, and:
//   - uploads it to Cloudinary as a "raw" file when Cloudinary credentials
//     are configured (same credentials already used for employee/bill
//     uploads) — this is what actually survives a Render redeploy/restart,
//     since local disk on Render's free plan does not.
//   - always also writes a local copy as a best-effort extra copy for the
//     current server lifetime (instant restore without needing to touch
//     Cloudinary at all, if the server hasn't restarted since).
//
// Restoring: download the .json.gz backup, gunzip it, and re-insert with a
// small script (or ask for one) — it's plain JSON keyed by table name, not
// a proprietary format.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const db = require("../database/database");

const BACKUP_TABLES = [
    "employees",
    "payroll",
    "finance_heads",
    "finance_allocations",
    "finance_bills",
    "finance_contingent_bills",
    "finance_contingent_bill_items",
    "cashbook_receipts",
    "cash_withdrawals",
    "temporary_receipts",
    "bank_deposits",
    "ho_remittances",
    "daily_closings",
    "ledger_parties",
    "ledger_entries",
    // Intentionally NOT including `users` — password hashes have no
    // business sitting in a downloadable backup file. Recreate accounts
    // via server/database/resetPasswords.js if ever needed.
];

const LOCAL_BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, "..", "..", "backups");
const MAX_LOCAL_BACKUPS = 20;
const MAX_CLOUD_BACKUPS = 60; // ~2 weeks at 4/day, or ~2 months at 1/day

const CLOUD_NAME_RE = /^[a-zA-Z0-9_-]+$/;
const rawCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const hasCloudUrl = !!process.env.CLOUDINARY_URL;
const hasCloudKeys = !!(
    rawCloudName &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let CLOUD_ENABLED = hasCloudUrl || hasCloudKeys;

if (CLOUD_ENABLED && !hasCloudUrl && !CLOUD_NAME_RE.test((rawCloudName || "").trim())) {
    console.error(
        `[backupPostgres] CLOUDINARY_CLOUD_NAME is set to "${rawCloudName}", which is not a ` +
        "valid Cloudinary cloud name. Cloud backups are disabled until this is corrected."
    );
    CLOUD_ENABLED = false;
}

let cloudinary = null;
if (CLOUD_ENABLED) {
    cloudinary = require("cloudinary").v2;
    if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }
}

let lastBackup = { at: null, ok: null, message: null, target: null };

function getLastBackupStatus() {
    return lastBackup;
}

async function snapshotTables() {
    const snapshot = { takenAt: new Date().toISOString(), tables: {} };
    for (const table of BACKUP_TABLES) {
        try {
            const result = await db.query(`SELECT * FROM ${table}`);
            snapshot.tables[table] = result.rows;
        } catch (e) {
            // A table that doesn't exist yet (fresh install) shouldn't
            // abort the whole backup — record the miss and keep going.
            snapshot.tables[table] = { error: e.message };
        }
    }
    return snapshot;
}

function gzipJson(obj) {
    return zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 9 });
}

async function uploadToCloudinary(buffer, filename) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "bluefarm/backups",
                resource_type: "raw",
                public_id: filename.replace(/\.gz$/, ""),
                format: "gz",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
}

async function pruneCloudinaryBackups() {
    if (!CLOUD_ENABLED) return;
    try {
        const res = await cloudinary.api.resources({
            type: "upload",
            resource_type: "raw",
            prefix: "bluefarm/backups/",
            max_results: 200,
        });
        const sorted = (res.resources || []).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        const toDelete = sorted.slice(MAX_CLOUD_BACKUPS).map((r) => r.public_id);
        if (toDelete.length) {
            await cloudinary.api.delete_resources(toDelete, { resource_type: "raw" });
        }
    } catch (e) {
        console.log("⚠️  Backup pruning (Cloudinary) failed:", e.message);
    }
}

function pruneLocalBackups() {
    try {
        const files = fs
            .readdirSync(LOCAL_BACKUP_DIR)
            .filter((f) => f.endsWith(".json.gz"))
            .map((f) => ({ f, t: fs.statSync(path.join(LOCAL_BACKUP_DIR, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t);
        files.slice(MAX_LOCAL_BACKUPS).forEach(({ f }) => {
            try {
                fs.unlinkSync(path.join(LOCAL_BACKUP_DIR, f));
            } catch (e) {
                // best effort
            }
        });
    } catch (e) {
        // best effort
    }
}

async function runBackup(reason = "manual") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `bluefarm-${stamp}.json.gz`;

    try {
        const snapshot = await snapshotTables();
        const buffer = gzipJson(snapshot);

        let target = "local disk only (NOT durable — set CLOUDINARY_* env vars for real off-server backups)";

        // Always keep a local copy — cheap, and useful if the server
        // hasn't restarted since the backup was made.
        try {
            fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
            fs.writeFileSync(path.join(LOCAL_BACKUP_DIR, filename), buffer);
            pruneLocalBackups();
        } catch (e) {
            console.log("⚠️  Local backup write failed:", e.message);
        }

        if (CLOUD_ENABLED) {
            const uploaded = await uploadToCloudinary(buffer, filename);
            target = uploaded.secure_url;
            pruneCloudinaryBackups().catch(() => {});
        }

        lastBackup = {
            at: new Date().toISOString(),
            ok: true,
            message: `Backup saved (${reason})`,
            target,
        };
        console.log(`🗄️  Database backup saved (${reason}) → ${target}`);
        return lastBackup;
    } catch (err) {
        lastBackup = {
            at: new Date().toISOString(),
            ok: false,
            message: err.message,
            target: null,
        };
        console.error("❌ Database backup failed:", err.message);
        return lastBackup;
    }
}

function startScheduledBackups() {
    // One shortly after startup (gives the DB a moment to finish init),
    // then every 6 hours for as long as the server runs.
    setTimeout(() => runBackup("startup"), 15 * 1000);
    setInterval(() => runBackup("scheduled"), 6 * 60 * 60 * 1000).unref();
}

module.exports = {
    runBackup,
    startScheduledBackups,
    getLastBackupStatus,
    CLOUD_ENABLED,
};

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "database", "bluefarm.db");
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");
const MAX_BACKUPS = 60;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function pruneOldBackups() {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".db"))
      .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);

    files.slice(MAX_BACKUPS).forEach(({ f }) => {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
      } catch (e) {
        console.log("⚠️ Could not remove old backup:", f, e.message);
      }
    });
  } catch (e) {
    console.log("⚠️ Backup pruning error:", e.message);
  }
}

// Copies the live SQLite DB into /backups with a timestamped name.
// `reason` is just for the log line (e.g. "startup", "scheduled", "pre-delete: /employees/12").
function runBackup(reason = "manual") {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log("⚠️ Backup skipped — database file not found yet:", DB_PATH);
      return;
    }
    ensureBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(BACKUP_DIR, `bluefarm-${stamp}.db`);
    fs.copyFileSync(DB_PATH, dest);
    pruneOldBackups();
    console.log(`🗄️  Backup saved (${reason}) → ${path.basename(dest)}`);
  } catch (e) {
    console.log("⚠️ Backup failed:", e.message);
  }
}

function startScheduledBackups() {
  // Snapshot on startup, then every 30 minutes while the server runs.
  runBackup("startup");
  setInterval(() => runBackup("scheduled"), 30 * 60 * 1000);
}

module.exports = { runBackup, startScheduledBackups };

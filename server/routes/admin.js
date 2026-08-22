const express = require("express");
const router = express.Router();

const { runBackup, getLastBackupStatus, CLOUD_ENABLED } = require("../utils/backupPostgres");

// Everything in this file is mounted behind requireAuth + requireAdmin in
// server.js — only an admin session can see or trigger backups.

// GET /api/admin/backup-status — when the last backup ran and whether it
// succeeded, plus whether backups are actually durable (Cloudinary
// configured) or only living on local disk (wiped on next redeploy).
router.get("/backup-status", (req, res) => {
    res.json({
        success: true,
        durable: CLOUD_ENABLED,
        warning: CLOUD_ENABLED
            ? null
            : "CLOUDINARY_* environment variables are not set — backups are only saved to local disk and WILL be lost on the next redeploy/restart. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to make backups durable.",
        lastBackup: getLastBackupStatus(),
    });
});

// POST /api/admin/backup-run — trigger an immediate backup on demand
// (e.g. right before a risky bulk edit or before undoing a salary batch).
router.post("/backup-run", async (req, res) => {
    const result = await runBackup("manual");
    res.status(result.ok ? 200 : 500).json({
        success: result.ok,
        message: result.message,
        target: result.target,
    });
});

module.exports = router;

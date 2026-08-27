const express = require("express");
const router = express.Router();

const { runBackup, getLastBackupStatus, CLOUD_ENABLED } = require("../utils/backupPostgres");
const db = require("../database/database");
const { hashPassword } = require("../utils/passwordHash");

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

// ============================================================
// USER / ID MANAGEMENT (ADMIN ONLY)
// ============================================================
router.get("/users", async (req, res) => {
    const result = await db.query(`SELECT id, username, name, role, farm, permissions FROM users ORDER BY username`);
    res.json({ success:true, users: result.rows });
});

router.post("/users", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim().toLowerCase();
        const name = String(req.body.name || "").trim();
        const password = String(req.body.password || "");
        const role = req.body.role === "admin" ? "admin" : "farm";
        const farm = req.body.farm || null;
        const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
        if (!username || !password) return res.status(400).json({success:false,message:"Username and password are required"});
        const r = await db.query(`INSERT INTO users (username,password,name,role,farm,permissions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,username,name,role,farm,permissions`, [username,hashPassword(password),name,role,farm,JSON.stringify(permissions)]);
        res.json({success:true,user:r.rows[0]});
    } catch(err) { res.status(400).json({success:false,message:err.code === '23505' ? 'Username already exists' : 'Could not create user'}); }
});

router.put("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const existing = await db.query(`SELECT * FROM users WHERE id=$1`, [id]);
        if (!existing.rows[0]) return res.status(404).json({success:false,message:"User not found"});
        const u=existing.rows[0];
        const username=String(req.body.username ?? u.username).trim().toLowerCase();
        const name=String(req.body.name ?? u.name ?? "").trim();
        const role=req.body.role === "admin" ? "admin" : (req.body.role === "farm" ? "farm" : u.role);
        const farm=req.body.farm ?? u.farm;
        const permissions=Array.isArray(req.body.permissions) ? req.body.permissions : (u.permissions || []);
        const r=await db.query(`UPDATE users SET username=$1,name=$2,role=$3,farm=$4,permissions=$5 WHERE id=$6 RETURNING id,username,name,role,farm,permissions`,[username,name,role,farm,JSON.stringify(permissions),id]);
        res.json({success:true,user:r.rows[0]});
    } catch(err){ res.status(400).json({success:false,message:err.code === '23505' ? 'Username already exists' : 'Could not update user'});}
});

router.put("/users/:id/password", async (req,res)=>{
    const password=String(req.body.password||"");
    if(password.length<4) return res.status(400).json({success:false,message:"Password must be at least 4 characters"});
    await db.query(`UPDATE users SET password=$1 WHERE id=$2`,[hashPassword(password),Number(req.params.id)]);
    res.json({success:true,message:"Password updated"});
});

router.delete("/users/:id", async (req,res)=>{
    const id=Number(req.params.id);
    const selfName=String(req.user?.username||"").toLowerCase();
    const r=await db.query(`SELECT username FROM users WHERE id=$1`,[id]);
    if(!r.rows[0]) return res.status(404).json({success:false,message:"User not found"});
    if(String(r.rows[0].username).toLowerCase()===selfName) return res.status(400).json({success:false,message:"You cannot delete your own ID"});
    await db.query(`DELETE FROM users WHERE id=$1`,[id]);
    res.json({success:true});
});

module.exports = router;

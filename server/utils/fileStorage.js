// Shared upload storage for employee documents and finance bill pictures.
//
// Why this exists: on Render's free plan (and similar ephemeral hosts),
// anything saved to local disk (the old /uploads folder) is WIPED on every
// redeploy or server restart. That's what was causing "bill picture 404
// after adding" — the file was gone, only the database row pointing at it
// survived.
//
// Fix: if Cloudinary credentials are present in the environment, files are
// uploaded straight to Cloudinary and the DB stores the permanent
// https:// URL instead of a local path. If no credentials are set, this
// falls back to the previous local-disk behavior automatically, so local
// development (and any host with real persistent disk) keeps working
// exactly as before with zero configuration.
//
// To enable persistent storage in production, set these on Render:
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
// (or a single CLOUDINARY_URL in the cloudinary://key:secret@cloud form)

const path = require("path");
const fs = require("fs");
const multer = require("multer");

const CLOUD_ENABLED = !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
);

const uploadDir = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

let cloudinary = null;
let CloudinaryStorage = null;

if (CLOUD_ENABLED) {
    cloudinary = require("cloudinary").v2;

    if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    ({ CloudinaryStorage } = require("multer-storage-cloudinary"));

    console.log(
        "[fileStorage] Cloudinary storage ENABLED — uploads will persist across redeploys."
    );
} else {
    console.log(
        "[fileStorage] Cloudinary not configured — using local disk storage. " +
        "Files WILL be lost on Render redeploys/restarts unless a persistent disk is attached. " +
        "Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET to fix this."
    );
}

// Map of the mimetypes this app accepts to a safe, fixed extension. Used so
// the file saved on local disk never trusts the extension in the
// attacker-controlled `originalname` (a client can send any bytes as
// "photo.png" while lying about its real type in other ways, but it can no
// longer choose the extension the file is saved under, e.g. ".html" or
// ".php" — the mimetype fileFilter in each route still decides what's
// accepted at all, this only decides what extension a good file gets).
const EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
};

/**
 * Build a multer storage engine for a given logical folder
 * (e.g. "bills", "employees"). Uses Cloudinary when configured,
 * otherwise falls back to local disk (old behavior).
 */
function makeStorage(folder) {
    if (CLOUD_ENABLED) {
        return new CloudinaryStorage({
            cloudinary,
            params: {
                folder: `bluefarm/${folder}`,
                resource_type: "auto", // handles images AND pdfs
                allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
            },
        });
    }

    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = EXT_BY_MIME[file.mimetype] || ".bin";
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            cb(null, unique);
        },
    });
}

/**
 * Given a multer `file` object (from req.file / req.files.x[0]) after a
 * successful upload, return the value that should be stored in the DB:
 * a permanent https:// URL when using Cloudinary, or the old
 * "/uploads/filename" relative path when using local disk.
 */
function storedPathOf(file) {
    if (!file) return null;
    if (CLOUD_ENABLED) return file.path; // CloudinaryStorage sets this to the secure_url
    return `/uploads/${file.filename}`;
}

/**
 * Delete a previously stored file, given the value that was saved in the
 * DB (either a local "/uploads/..." path or a full Cloudinary URL).
 * Safe to call with null/undefined.
 */
function deleteStoredFile(storedValue) {
    if (!storedValue) return;

    if (/^https?:\/\//i.test(storedValue)) {
        if (!CLOUD_ENABLED || !cloudinary) return;
        try {
            const afterUpload = storedValue.split("/upload/")[1] || "";
            const withoutVersion = afterUpload.replace(/^v\d+\//, "");
            const publicId = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");
            if (publicId) {
                cloudinary.uploader.destroy(publicId, { resource_type: "auto" }).catch((e) => {
                    console.error("[fileStorage] Cloudinary delete failed:", e.message);
                });
            }
        } catch (e) {
            console.error("[fileStorage] Cloudinary delete failed:", e.message);
        }
        return;
    }

    fs.unlink(path.join(uploadDir, path.basename(storedValue)), () => {});
}

/**
 * Whether a newly-uploaded file can be confirmed present. Only meaningful
 * for local disk storage — Cloudinary uploads are already confirmed
 * successful by the time multer's callback returns (file.path is a live
 * remote URL, not something we can/should fs.existsSync check).
 */
function localFileMissing(file) {
    if (!file || CLOUD_ENABLED) return false;
    return !fs.existsSync(path.join(uploadDir, file.filename));
}

module.exports = {
    CLOUD_ENABLED,
    uploadDir,
    makeStorage,
    storedPathOf,
    deleteStoredFile,
    localFileMissing,
};

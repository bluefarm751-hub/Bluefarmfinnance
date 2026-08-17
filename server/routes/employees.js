const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database/database");

// ===================================
// FILE UPLOAD SETUP (employee photo + CNIC copy)
// ===================================
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6) + path.extname(file.originalname);
    cb(null, unique);
  },
});

// Only allow image/PDF documents (photo, CNIC, police verification) and cap
// size at 8MB — an open upload with no filter/limit lets anyone push any
// file type (including executables) or oversized files to the server.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP or PDF files are allowed"));
  },
});

const employeeUpload = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "cnicCopy", maxCount: 1 },
  { name: "policeVerification", maxCount: 1 },
]);

// ===================================
// GET ALL EMPLOYEES (supports ?farm= and ?search=)
// ===================================
router.get("/", (req, res) => {

    const farm = req.query.farm;
    const search = req.query.search;

    let sql = "SELECT * FROM employees WHERE 1=1";
    let params = [];

    if (farm) {
        sql += " AND farm=?";
        params.push(farm);
    }

    if (search) {
        sql += " AND (name LIKE ? OR cnic LIKE ? OR employeeNo LIKE ? OR mobile LIKE ?)";
        const term = `%${search}%`;
        params.push(term, term, term, term);
    }

    sql += " ORDER BY id DESC";

    db.all(sql, params, (err, rows) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json(rows);

    });

});

// ===================================
// GET SINGLE EMPLOYEE
// ===================================
router.get("/:id", (req, res) => {

    db.get(
        "SELECT * FROM employees WHERE id=?",
        [req.params.id],
        (err, row) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            res.json(row);

        }
    );

});

// ===================================
// ADD EMPLOYEE
// ===================================
router.post("/", employeeUpload, (req, res) => {

    console.log("BODY RECEIVED:");
    console.log(req.body);

    const {
        employeeNo,
        name,
        fatherName,
        cnic,
        mobile,
        familyMobile,
        address,
        appointment,
        department,
        farm,
        joiningDate,
        employeeType,
        maritalStatus,
        status,
        grossSalary,
        bankName,
        accountTitle,
        iban,
        remarks
    } = req.body;

    const photo = req.files?.photo?.[0]
        ? `/uploads/${req.files.photo[0].filename}`
        : (req.body.photo || null);

    const cnicCopy = req.files?.cnicCopy?.[0]
        ? `/uploads/${req.files.cnicCopy[0].filename}`
        : (req.body.cnicCopy || null);

    const policeVerification = req.files?.policeVerification?.[0]
        ? `/uploads/${req.files.policeVerification[0].filename}`
        : (req.body.policeVerification || null);

    const sql = `
        INSERT INTO employees (
            photo,
            employeeNo,
            name,
            fatherName,
            cnic,
            mobile,
            familyMobile,
            address,
            appointment,
            department,
            farm,
            joiningDate,
            employeeType,
            maritalStatus,
            status,
            grossSalary,
            bankName,
            accountTitle,
            iban,
            cnicCopy,
            policeVerification,
            remarks
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    db.run(
        sql,
        [
            photo,
            employeeNo,
            name,
            fatherName,
            cnic,
            mobile,
            familyMobile,
            address,
            appointment,
            department,
            farm,
            joiningDate,
            employeeType,
            maritalStatus,
            status,
            grossSalary,
            bankName,
            accountTitle,
            iban,
            cnicCopy,
            policeVerification,
            remarks
        ],
        function(err){

            if(err){

                console.log("DATABASE ERROR:");
                console.log(err);

                return res.status(500).json(err);
            }

            res.json({
                success:true,
                id:this.lastID
            });

        }
    );

});

// ===================================
// UPDATE EMPLOYEE
// ===================================
router.put("/:id", employeeUpload, (req, res) => {

    const {
        employeeNo,
        name,
        fatherName,
        cnic,
        mobile,
        familyMobile,
        address,
        appointment,
        department,
        farm,
        joiningDate,
        employeeType,
        maritalStatus,
        status,
        grossSalary,
        bankName,
        accountTitle,
        iban,
        remarks
    } = req.body;

    const photo = req.files?.photo?.[0]
        ? `/uploads/${req.files.photo[0].filename}`
        : (req.body.photo || null);

    const cnicCopy = req.files?.cnicCopy?.[0]
        ? `/uploads/${req.files.cnicCopy[0].filename}`
        : (req.body.cnicCopy || null);

    const policeVerification = req.files?.policeVerification?.[0]
        ? `/uploads/${req.files.policeVerification[0].filename}`
        : (req.body.policeVerification || null);

    const sql = `
        UPDATE employees SET
            photo=?,
            employeeNo=?,
            name=?,
            fatherName=?,
            cnic=?,
            mobile=?,
            familyMobile=?,
            address=?,
            appointment=?,
            department=?,
            farm=?,
            joiningDate=?,
            employeeType=?,
            maritalStatus=?,
            status=?,
            grossSalary=?,
            bankName=?,
            accountTitle=?,
            iban=?,
            cnicCopy=?,
            policeVerification=?,
            remarks=?,
            updatedAt=CURRENT_TIMESTAMP
        WHERE id=?
    `;

    db.run(
        sql,
        [
            photo,
            employeeNo,
            name,
            fatherName,
            cnic,
            mobile,
            familyMobile,
            address,
            appointment,
            department,
            farm,
            joiningDate,
            employeeType,
            maritalStatus,
            status,
            grossSalary,
            bankName,
            accountTitle,
            iban,
            cnicCopy,
            policeVerification,
            remarks,
            req.params.id
        ],
        function (err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            res.json({
                success: true,
                message: "Employee Updated Successfully"
            });

        }
    );

});

// ===================================
// DELETE ONE EMPLOYEE DOCUMENT (photo / cnicCopy / policeVerification)
// ===================================
router.delete("/:id/document/:type", (req, res) => {

    const allowedTypes = ["photo", "cnicCopy", "policeVerification"];
    const type = req.params.type;

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            message: "Invalid document type"
        });
    }

    db.run(
        `UPDATE employees SET ${type}=NULL, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
        [req.params.id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            res.json({
                success: true,
                message: "Document deleted successfully"
            });

        }
    );

});

// ===================================
// DELETE EMPLOYEE
// ===================================
router.delete("/:id", (req, res) => {

    db.run(
        "DELETE FROM employees WHERE id=?",
        [req.params.id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            res.json({
                success: true,
                message: "Employee Deleted Successfully"
            });

        }
    );

});

module.exports = router;
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database/database");
const { makeStorage, storedPathOf, friendlyUploadError } = require("../utils/fileStorage");

// ==========================================
// FILE UPLOAD SETUP
// ==========================================

const uploadDir = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = makeStorage("employees");


// ==========================================
// ALLOWED FILE TYPES
// ==========================================

const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
];

const upload = multer({
    storage,

    limits: {
        fileSize: 8 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        if (ALLOWED_MIME.includes(file.mimetype)) {
            return cb(null, true);
        }

        cb(
            new Error(
                "Only JPG, PNG, WEBP or PDF files are allowed"
            )
        );
    }
});


// ==========================================
// EMPLOYEE UPLOAD FIELDS
// ==========================================

const employeeUpload = upload.fields([
    {
        name: "photo",
        maxCount: 1
    },
    {
        name: "cnicCopy",
        maxCount: 1
    },
    {
        name: "policeVerification",
        maxCount: 1
    }
]);


// ==========================================
// GET ALL EMPLOYEES
// GET /api/employees
//
// Optional:
// ?farm=Blue Farm
// ?search=Kamran
// ==========================================

router.get("/", async (req, res) => {

    try {

        const farm = req.query.farm;
        const search = req.query.search;

        let sql = `
            SELECT *
            FROM employees
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;


        // ------------------------------------------
        // FARM FILTER
        // ------------------------------------------

        if (farm) {

            sql += ` AND farm = $${paramIndex}`;

            params.push(farm);

            paramIndex++;
        }


        // ------------------------------------------
        // SEARCH
        // ------------------------------------------

        if (search) {

            sql += `
                AND (
                    name ILIKE $${paramIndex}
                    OR cnic ILIKE $${paramIndex}
                    OR "employeeNo" ILIKE $${paramIndex}
                    OR mobile ILIKE $${paramIndex}
                )
            `;

            const term = `%${search}%`;

            params.push(term);

            paramIndex++;
        }


        sql += `
            ORDER BY id DESC
        `;


        const result = await db.query(sql, params);


        return res.json(result.rows);

    } catch (err) {

        console.error("❌ Get employees error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// ==========================================
// GET SINGLE EMPLOYEE
// GET /api/employees/:id
// ==========================================

router.get("/:id", async (req, res) => {

    try {

        const result = await db.query(
            `
            SELECT *
            FROM employees
            WHERE id = $1
            LIMIT 1
            `,
            [req.params.id]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }


        return res.json(result.rows[0]);

    } catch (err) {

        console.error("❌ Get employee error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// ==========================================
// ADD EMPLOYEE
// POST /api/employees
// ==========================================

router.post("/", employeeUpload, async (req, res) => {

    try {

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
            remarks,
            policeVerificationDate
        } = req.body;


        // ------------------------------------------
        // FILE PATHS
        // ------------------------------------------

        const photo = req.files?.photo?.[0]
            ? storedPathOf(req.files.photo[0])
            : (req.body.photo || null);


        const cnicCopy = req.files?.cnicCopy?.[0]
            ? storedPathOf(req.files.cnicCopy[0])
            : (req.body.cnicCopy || null);


        const policeVerification =
            req.files?.policeVerification?.[0]
                ? storedPathOf(req.files.policeVerification[0])
                : (req.body.policeVerification || null);


        // ------------------------------------------
        // INSERT
        // ------------------------------------------

        const result = await db.query(
            `
            INSERT INTO employees (
                photo,
                "employeeNo",
                name,
                "fatherName",
                cnic,
                mobile,
                "familyMobile",
                address,
                appointment,
                department,
                farm,
                "joiningDate",
                "employeeType",
                "maritalStatus",
                status,
                "grossSalary",
                "bankName",
                "accountTitle",
                iban,
                "cnicCopy",
                "policeVerification",
                "policeVerificationDate",
                remarks
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23
            )
            RETURNING id
            `,
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
                policeVerificationDate || null,
                remarks
            ]
        );


        return res.json({
            success: true,
            message: "Employee added successfully",
            id: result.rows[0].id
        });

    } catch (err) {

        console.error("❌ Add employee error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// ==========================================
// UPDATE EMPLOYEE
// PUT /api/employees/:id
// ==========================================

router.put("/:id", employeeUpload, async (req, res) => {

    try {

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
            remarks,
            policeVerificationDate
        } = req.body;


        // ------------------------------------------
        // CHECK EMPLOYEE
        // ------------------------------------------

        const existing = await db.query(
            `
            SELECT *
            FROM employees
            WHERE id = $1
            `,
            [req.params.id]
        );


        if (existing.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }


        const old = existing.rows[0];

        // ------------------------------------------
        // SALARY / BANK FIELDS ARE ADMIN-ONLY
        // ------------------------------------------
        // The Sidebar only shows "Update Salary" (and Finance/Payroll in
        // general) to admin accounts, but this same PUT endpoint is also
        // used by the ordinary, non-admin-accessible "Edit Employee" form.
        // Without this check, a non-admin user could reuse this endpoint
        // directly to change salary or bank details even though the UI
        // never lets them do that. Non-admin edits keep the existing
        // values for these fields no matter what was sent.
        const isAdmin = req.user?.role === "admin";
        const effectiveGrossSalary = isAdmin ? grossSalary : old.grossSalary;
        const effectiveBankName = isAdmin ? bankName : old.bankName;
        const effectiveAccountTitle = isAdmin ? accountTitle : old.accountTitle;
        const effectiveIban = isAdmin ? iban : old.iban;


        // ------------------------------------------
        // KEEP OLD FILE IF NEW FILE NOT UPLOADED
        // ------------------------------------------

        const photo = req.files?.photo?.[0]
            ? storedPathOf(req.files.photo[0])
            : (req.body.photo !== undefined
                ? req.body.photo
                : old.photo);


        const cnicCopy = req.files?.cnicCopy?.[0]
            ? storedPathOf(req.files.cnicCopy[0])
            : (req.body.cnicCopy !== undefined
                ? req.body.cnicCopy
                : old.cnicCopy);


        const policeVerification =
            req.files?.policeVerification?.[0]
                ? storedPathOf(req.files.policeVerification[0])
                : (req.body.policeVerification !== undefined
                    ? req.body.policeVerification
                    : old.policeVerification);

        const effectivePoliceVerificationDate =
            policeVerificationDate !== undefined
                ? (policeVerificationDate || null)
                : old.policeVerificationDate;


        // ------------------------------------------
        // UPDATE
        // ------------------------------------------

        await db.query(
            `
            UPDATE employees
            SET
                photo = $1,
                "employeeNo" = $2,
                name = $3,
                "fatherName" = $4,
                cnic = $5,
                mobile = $6,
                "familyMobile" = $7,
                address = $8,
                appointment = $9,
                department = $10,
                farm = $11,
                "joiningDate" = $12,
                "employeeType" = $13,
                "maritalStatus" = $14,
                status = $15,
                "grossSalary" = $16,
                "bankName" = $17,
                "accountTitle" = $18,
                iban = $19,
                "cnicCopy" = $20,
                "policeVerification" = $21,
                "policeVerificationDate" = $22,
                remarks = $23,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $24
            `,
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
                effectiveGrossSalary,
                effectiveBankName,
                effectiveAccountTitle,
                effectiveIban,
                cnicCopy,
                policeVerification,
                effectivePoliceVerificationDate,
                remarks,
                req.params.id
            ]
        );


        return res.json({
            success: true,
            message: "Employee updated successfully"
        });

    } catch (err) {

        console.error("❌ Update employee error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// ==========================================
// DELETE EMPLOYEE DOCUMENT
//
// DELETE /api/employees/:id/document/photo
// DELETE /api/employees/:id/document/cnicCopy
// DELETE /api/employees/:id/document/policeVerification
// ==========================================

router.delete("/:id/document/:type", async (req, res) => {

    try {

        const allowedTypes = [
            "photo",
            "cnicCopy",
            "policeVerification"
        ];

        const type = req.params.type;


        if (!allowedTypes.includes(type)) {

            return res.status(400).json({
                success: false,
                message: "Invalid document type"
            });
        }


        // ------------------------------------------
        // PostgreSQL column names are inserted only
        // after checking against allowedTypes above.
        // ------------------------------------------

        const result = await db.query(
            `
            UPDATE employees
            SET "${type}" = NULL,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [req.params.id]
        );


        if (result.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }


        return res.json({
            success: true,
            message: "Document deleted successfully"
        });

    } catch (err) {

        console.error("❌ Delete document error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// ==========================================
// DELETE EMPLOYEE
// DELETE /api/employees/:id
// ==========================================

router.delete("/:id", async (req, res) => {

    try {

        const result = await db.query(
            `
            DELETE FROM employees
            WHERE id = $1
            `,
            [req.params.id]
        );


        if (result.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }


        return res.json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (err) {

        console.error("❌ Delete employee error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


// ==========================================
// MULTER ERROR HANDLER
// ==========================================

router.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                success: false,
                message: "File is too large. Maximum size is 8MB."
            });
        }

        return res.status(400).json({
            success: false,
            message: err.message
        });
    }


    if (err) {

        return res.status(400).json({
            success: false,
            message: friendlyUploadError(err)
        });
    }


    next();
});


module.exports = router;
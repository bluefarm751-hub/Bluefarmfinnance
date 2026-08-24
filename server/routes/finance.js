const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database/database");
const { buildSourceTag } = require("../utils/sourceTag");
const { balances: getCashbookBalances } = require("./cashbook");
const {
    makeStorage,
    storedPathOf,
    deleteStoredFile,
    localFileMissing,
    friendlyUploadError,
} = require("../utils/fileStorage");

// ============================================================
// HELPERS
// ============================================================

const num = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

const moneyFmt = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;

const isBank = (mode) => {
    const m = String(mode || "").toLowerCase();

    return (
        m.includes("bank") ||
        m.includes("cheque") ||
        m.includes("transfer") ||
        m.includes("online")
    );
};

// ============================================================
// FILE UPLOAD
// ============================================================

const uploadDir = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = makeStorage("bills");

const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];

const upload = multer({
    storage,

    limits: {
        fileSize: 8 * 1024 * 1024,
    },

    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
            return cb(null, true);
        }

        return cb(
            new Error(
                "Only JPG, PNG, WEBP or PDF files are allowed"
            )
        );
    },
});

const billUpload = upload.single("billPic");

// ============================================================
// FINANCE HEADS
// ============================================================

// GET ALL HEADS
router.get("/heads", async (req, res) => {
    try {
        const { farm } = req.query;

        let sql = `
            SELECT
                h.*,

                COALESCE(
                    (
                        SELECT SUM(b.amount)
                        FROM finance_bills b
                        WHERE b."headId" = h.id
                    ),
                    0
                ) AS spent,

                (
                    SELECT COUNT(*)
                    FROM finance_bills b
                    WHERE b."headId" = h.id
                ) AS "billCount",

                COALESCE(
                    (
                        SELECT SUM(a.amount)
                        FROM finance_allocations a
                        WHERE a."headId" = h.id
                    ),
                    0
                ) AS allocated,

                (
                    SELECT COUNT(*)
                    FROM finance_allocations a
                    WHERE a."headId" = h.id
                ) AS "allocationCount"

            FROM finance_heads h
            WHERE 1 = 1
        `;

        const params = [];

        if (farm) {
            params.push(farm);
            sql += ` AND h.farm = $${params.length}`;
        }

        sql += `
            ORDER BY
                h."createdAt" DESC NULLS LAST,
                h.id DESC
        `;

        const result = await db.query(sql, params);

        const data = result.rows.map((row) => {
            const baseAmount = num(row.amount);
            const allocationAmount = num(row.allocated);
            const spent = num(row.spent);

            const totalAllocated =
                baseAmount + allocationAmount;

            return {
                ...row,

                amount: totalAllocated,
                baseAmount,

                allocated: totalAllocated,

                allocationCount:
                    Number(row.allocationCount) || 0,

                spent,

                billCount:
                    Number(row.billCount) || 0,

                remaining:
                    totalAllocated - spent,
            };
        });

        res.json(data);

    } catch (err) {
        console.error("GET /finance/heads:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// GET SINGLE HEAD
router.get("/heads/:id", async (req, res) => {
    try {
        const result = await db.query(
            `
            SELECT *
            FROM finance_heads
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Head not found",
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error("GET /finance/heads/:id:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ADD HEAD
router.post("/heads", async (req, res) => {
    try {
        const {
            farm,
            headName,
            amount,
            allocationDate,
            letterReference,
            remarks,
        } = req.body;

        if (!headName || !String(headName).trim()) {
            return res.status(400).json({
                success: false,
                message: "Head name is required",
            });
        }

        const result = await db.query(
            `
            INSERT INTO finance_heads
            (
                farm,
                "headName",
                amount,
                "allocationDate",
                "letterReference",
                remarks
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING id
            `,
            [
                farm || null,
                String(headName).trim(),
                num(amount),
                allocationDate || "",
                letterReference || "",
                remarks || "",
            ]
        );

        res.json({
            success: true,
            message: "Head added successfully",
            id: result.rows[0].id,
        });

    } catch (err) {
        console.error("POST /finance/heads:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// UPDATE HEAD
router.put("/heads/:id", async (req, res) => {
    try {
        const {
            headName,
            amount,
            allocationDate,
            letterReference,
            remarks,
        } = req.body;

        if (!headName || !String(headName).trim()) {
            return res.status(400).json({
                success: false,
                message: "Head name is required",
            });
        }

        const result = await db.query(
            `
            UPDATE finance_heads
            SET
                "headName" = $1,
                amount = $2,
                "allocationDate" = $3,
                "letterReference" = $4,
                remarks = $5,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $6
            `,
            [
                String(headName).trim(),
                num(amount),
                allocationDate || "",
                letterReference || "",
                remarks || "",
                req.params.id,
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Head not found",
            });
        }

        res.json({
            success: true,
            message: "Head updated successfully",
        });

    } catch (err) {
        console.error("PUT /finance/heads:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// DELETE HEAD
router.delete("/heads/:id", async (req, res) => {
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const billCheck = await client.query(
            `
            SELECT COUNT(*)::int AS "billCount"
            FROM finance_bills
            WHERE "headId" = $1
            `,
            [req.params.id]
        );

        if (billCheck.rows[0].billCount > 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message:
                    "This head still has bills. Delete its bills first, then delete the head.",
            });
        }

        await client.query(
            `
            DELETE FROM finance_allocations
            WHERE "headId" = $1
            `,
            [req.params.id]
        );

        const result = await client.query(
            `
            DELETE FROM finance_heads
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Head not found",
            });
        }

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Head deleted successfully",
        });

    } catch (err) {
        await client.query("ROLLBACK");

        console.error("DELETE /finance/heads:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });

    } finally {
        client.release();
    }
});

// ============================================================
// ALLOCATIONS
// ============================================================

// GET ALLOCATIONS
router.get("/allocations", async (req, res) => {
    try {
        const { farm, headId } = req.query;

        let sql = `
            SELECT
                a.*,
                h."headName" AS "headName"
            FROM finance_allocations a
            LEFT JOIN finance_heads h
                ON h.id = a."headId"
            WHERE 1 = 1
        `;

        const params = [];

        if (farm) {
            params.push(farm);
            sql += ` AND a.farm = $${params.length}`;
        }

        if (headId) {
            params.push(headId);
            sql += ` AND a."headId" = $${params.length}`;
        }

        sql += ` ORDER BY a.id DESC`;

        const result = await db.query(sql, params);

        const data = result.rows.map((row) => ({
            ...row,

            sourceTag:
                row.sourceTag ||
                buildSourceTag(row.farm, "ALLOCATION"),
        }));

        res.json(data);

    } catch (err) {
        console.error("GET /finance/allocations:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ADD ALLOCATION
router.post("/allocations", async (req, res) => {
    try {
        const {
            farm,
            headId,
            amount,
            allocationDate,
            letterReference,
            remarks,
        } = req.body;

        if (!headId) {
            return res.status(400).json({
                success: false,
                message: "Head is required",
            });
        }

        const amt = num(amount);

        if (amt <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid amount is required",
            });
        }

        const headCheck = await db.query(
            `
            SELECT id
            FROM finance_heads
            WHERE id = $1
            `,
            [headId]
        );

        if (headCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Head not found",
            });
        }

        const sourceTag =
            buildSourceTag(farm, "ALLOCATION");

        const result = await db.query(
            `
            INSERT INTO finance_allocations
            (
                farm,
                "headId",
                amount,
                "allocationDate",
                "letterReference",
                remarks,
                "sourceTag"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING id
            `,
            [
                farm || null,
                headId,
                amt,
                allocationDate || "",
                letterReference || "",
                remarks || "",
                sourceTag,
            ]
        );

        res.json({
            success: true,
            message: "Allocation added successfully",
            id: result.rows[0].id,
            sourceTag,
        });

    } catch (err) {
        console.error("POST /finance/allocations:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// UPDATE ALLOCATION
router.put("/allocations/:id", async (req, res) => {
    try {
        const {
            headId,
            amount,
            allocationDate,
            letterReference,
            remarks,
        } = req.body;

        const oldResult = await db.query(
            `
            SELECT *
            FROM finance_allocations
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (oldResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Allocation not found",
            });
        }

        const row = oldResult.rows[0];

        const result = await db.query(
            `
            UPDATE finance_allocations
            SET
                "headId" = $1,
                amount = $2,
                "allocationDate" = $3,
                "letterReference" = $4,
                remarks = $5,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $6
            `,
            [
                headId || row.headId,
                amount !== undefined
                    ? num(amount)
                    : num(row.amount),
                allocationDate ??
                    row.allocationDate ??
                    "",
                letterReference ??
                    row.letterReference ??
                    "",
                remarks ?? row.remarks ?? "",
                req.params.id,
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Allocation not found",
            });
        }

        res.json({
            success: true,
            message: "Allocation updated successfully",
        });

    } catch (err) {
        console.error("PUT /finance/allocations:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// DELETE ALLOCATION
router.delete("/allocations/:id", async (req, res) => {
    try {
        const result = await db.query(
            `
            DELETE FROM finance_allocations
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Allocation not found",
            });
        }

        res.json({
            success: true,
            message: "Allocation deleted successfully",
        });

    } catch (err) {
        console.error("DELETE /finance/allocations:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// BILLS
// ============================================================

// GET BILLS
router.get("/bills", async (req, res) => {
    try {
        const { farm, headId } = req.query;

        let sql = `
            SELECT
                b.*,
                h."headName" AS "headName"
            FROM finance_bills b
            LEFT JOIN finance_heads h
                ON h.id = b."headId"
            WHERE 1 = 1
        `;

        const params = [];

        if (farm) {
            params.push(farm);
            sql += ` AND b.farm = $${params.length}`;
        }

        if (headId) {
            params.push(headId);
            sql += ` AND b."headId" = $${params.length}`;
        }

        sql += `
            ORDER BY
                b."sNo" ASC,
                b.id ASC
        `;

        const result = await db.query(sql, params);

        const data = result.rows.map((row) => ({
            ...row,

            sourceTag:
                row.sourceTag ||
                buildSourceTag(row.farm, "BILL"),
        }));

        res.json(data);

    } catch (err) {
        console.error("GET /finance/bills:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ADD BILL
router.post("/bills", billUpload, async (req, res) => {
    try {
        const {
            farm,
            headId,
            contractorName,
            item,
            qty,
            price,
            amount,
            paymentMode,
            remarks,
            billDate,
            status,
            chequeNo,
            chequeDate,
            sNo: sNoInput,
        } = req.body;

        if (!headId) {
            return res.status(400).json({
                success: false,
                message: "Head is required",
            });
        }

        const billAmount = num(amount);

        if (billAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid bill amount is required",
            });
        }

        const actualPaymentMode =
            paymentMode || "Cash";

        // Cash balance check
        if (
            String(actualPaymentMode).toLowerCase() === "cash"
        ) {
            const bal = await getCashbookBalances();

            if (billAmount > num(bal.cashInHand)) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Insufficient cash in hand. ` +
                        `Available: ${moneyFmt(bal.cashInHand)}, ` +
                        `requested: ${moneyFmt(billAmount)}. ` +
                        `Please withdraw more cash from the bank first.`,
                });
            }
        }

        const billPic = storedPathOf(req.file);

        const sourceTag =
            buildSourceTag(farm, "BILL");

        // Check head
        const headCheck = await db.query(
            `
            SELECT id
            FROM finance_heads
            WHERE id = $1
            `,
            [headId]
        );

        if (headCheck.rows.length === 0) {
            if (req.file) {
                deleteStoredFile(billPic);
            }

            return res.status(404).json({
                success: false,
                message: "Head not found",
            });
        }

        // S No: user can type their own on the Add Bill form. Only fall back
        // to auto-numbering (next after the current max) when they leave it
        // blank/invalid — so manual entries are respected as typed.
        let sNo = Number(sNoInput);

        if (!sNo || sNo <= 0) {
            const numberResult = await db.query(
                `
                SELECT
                    COALESCE(MAX("sNo"), 0) + 1 AS "nextNo"
                FROM finance_bills
                WHERE farm IS NOT DISTINCT FROM $1
                `,
                [farm || null]
            );

            sNo = Number(numberResult.rows[0].nextNo) || 1;
        }

        const result = await db.query(
            `
            INSERT INTO finance_bills
            (
                farm,
                "sNo",
                "headId",
                "contractorName",
                item,
                qty,
                price,
                amount,
                "paymentMode",
                "chequeNo",
                "chequeDate",
                remarks,
                "billPic",
                "billDate",
                status,
                "sourceTag"
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,
                $9,$10,$11,$12,$13,$14,$15,$16
            )
            RETURNING id
            `,
            [
                farm || null,
                sNo,
                headId,
                contractorName || "",
                item || "",
                num(qty),
                num(price),
                billAmount,
                actualPaymentMode,
                chequeNo || "",
                chequeDate || "",
                remarks || "",
                billPic,
                billDate || "",
                status || "Not Paid",
                sourceTag,
            ]
        );

        res.json({
            success: true,
            message: "Bill added successfully",
            id: result.rows[0].id,
            sNo,
            sourceTag,
        });

    } catch (err) {
        console.error("POST /finance/bills:", err);

        if (req.file) {
            deleteStoredFile(storedPathOf(req.file));
        }

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// UPDATE BILL
router.put("/bills/:id", billUpload, async (req, res) => {
    try {
        const {
            headId,
            contractorName,
            item,
            qty,
            price,
            amount,
            paymentMode,
            remarks,
            billDate,
            status,
            chequeNo,
            chequeDate,
            removeBillPic,
        } = req.body;

        const oldResult = await db.query(
            `
            SELECT *
            FROM finance_bills
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (oldResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Bill not found",
            });
        }

        const row = oldResult.rows[0];

        const newPaymentMode =
            paymentMode ||
            row.paymentMode ||
            "Cash";

        const newAmount =
            amount !== undefined
                ? num(amount)
                : num(row.amount);

        // Cash check
        const oldWasCash =
            !isBank(row.paymentMode);

        const newIsCash =
            !isBank(newPaymentMode);

        if (newIsCash) {
            const bal =
                await getCashbookBalances();

            let availableCash =
                num(bal.cashInHand);

            // Put the old cash bill back before checking
            // the replacement amount.
            if (oldWasCash) {
                availableCash += num(row.amount);
            }

            if (newAmount > availableCash) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Insufficient cash in hand. ` +
                        `Available: ${moneyFmt(availableCash)}, ` +
                        `requested: ${moneyFmt(newAmount)}.`,
                });
            }
        }

        const wantsRemove =
            removeBillPic === true ||
            removeBillPic === "true";

        const newBillPic =
            req.file
                ? storedPathOf(req.file)
                : wantsRemove
                    ? null
                    : row.billPic;

        // If new file uploaded, verify it exists before DB update
        // (only meaningful for local disk storage; a Cloudinary upload
        // is already confirmed by the time we get here).
        if (localFileMissing(req.file)) {
            return res.status(500).json({
                success: false,
                message: "Uploaded bill file could not be saved",
            });
        }

        const result = await db.query(
            `
            UPDATE finance_bills
            SET
                "headId" = $1,
                "contractorName" = $2,
                item = $3,
                qty = $4,
                price = $5,
                amount = $6,
                "paymentMode" = $7,
                "chequeNo" = $8,
                "chequeDate" = $9,
                remarks = $10,
                "billPic" = $11,
                "billDate" = $12,
                status = $13,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $14
            `,
            [
                headId || row.headId,
                contractorName ??
                    row.contractorName ??
                    "",
                item ??
                    row.item ??
                    "",
                qty !== undefined
                    ? num(qty)
                    : num(row.qty),
                price !== undefined
                    ? num(price)
                    : num(row.price),
                newAmount,
                newPaymentMode,
                chequeNo ??
                    row.chequeNo ??
                    "",
                chequeDate ??
                    row.chequeDate ??
                    "",
                remarks ??
                    row.remarks ??
                    "",
                newBillPic,
                billDate ??
                    row.billDate ??
                    "",
                status ??
                    row.status ??
                    "Not Paid",
                req.params.id,
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Bill not found",
            });
        }

        // Delete old file only AFTER successful DB update.
        if (
            (req.file || wantsRemove) &&
            row.billPic
        ) {
            deleteStoredFile(row.billPic);
        }

        res.json({
            success: true,
            message: "Bill updated successfully",
        });

    } catch (err) {
        console.error("PUT /finance/bills:", err);

        if (req.file) {
            deleteStoredFile(storedPathOf(req.file));
        }

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// DELETE BILL
router.delete("/bills/:id", async (req, res) => {
    try {
        const oldResult = await db.query(
            `
            SELECT "billPic"
            FROM finance_bills
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (oldResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Bill not found",
            });
        }

        const billPic =
            oldResult.rows[0].billPic;

        const result = await db.query(
            `
            DELETE FROM finance_bills
            WHERE id = $1
            `,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Bill not found",
            });
        }

        if (billPic) {
            deleteStoredFile(billPic);
        }

        res.json({
            success: true,
            message: "Bill deleted successfully",
        });

    } catch (err) {
        console.error("DELETE /finance/bills:", err);

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// CONTINGENT BILLS
// ============================================================

// LIST CONTINGENT BILLS
router.get("/contingent-bills", async (req, res) => {
    try {
        const {
            farm,
            month,
            year,
            headId,
        } = req.query;

        let sql = `
            SELECT
                cb.*,
                COALESCE(
                    cb."paymentHead",
                    h."headName"
                ) AS "headName"
            FROM finance_contingent_bills cb
            LEFT JOIN finance_heads h
                ON h.id = cb."headId"
            WHERE 1 = 1
        `;

        const params = [];

        if (farm) {
            params.push(farm);
            sql += ` AND cb.farm = $${params.length}`;
        }

        if (month) {
            params.push(month);
            sql += ` AND cb.month = $${params.length}`;
        }

        if (year) {
            params.push(year);
            sql += ` AND cb.year = $${params.length}`;
        }

        if (headId) {
            params.push(headId);
            sql += ` AND cb."headId" = $${params.length}`;
        }

        sql += ` ORDER BY cb.id DESC`;

        const billResult =
            await db.query(sql, params);

        const bills = billResult.rows;

        if (bills.length === 0) {
            return res.json([]);
        }

        const ids = bills.map(
            (bill) => bill.id
        );

        const itemResult = await db.query(
            `
            SELECT *
            FROM finance_contingent_bill_items
            WHERE "contingentBillId" = ANY($1::int[])
            ORDER BY
                "contingentBillId" ASC,
                "sortOrder" ASC,
                id ASC
            `,
            [ids]
        );

        const itemsByBill = {};

        itemResult.rows.forEach((item) => {
            if (!itemsByBill[item.contingentBillId]) {
                itemsByBill[item.contingentBillId] = [];
            }

            itemsByBill[item.contingentBillId].push(item);
        });

        const data = bills.map((bill) => ({
            ...bill,

            items:
                itemsByBill[bill.id] || [],
        }));

        res.json(data);

    } catch (err) {
        console.error(
            "GET /finance/contingent-bills:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// GET SINGLE CONTINGENT BILL
router.get(
    "/contingent-bills/:id",
    async (req, res) => {
        try {
            const billResult = await db.query(
                `
                SELECT
                    cb.*,
                    COALESCE(
                        cb."paymentHead",
                        h."headName"
                    ) AS "headName"
                FROM finance_contingent_bills cb
                LEFT JOIN finance_heads h
                    ON h.id = cb."headId"
                WHERE cb.id = $1
                `,
                [req.params.id]
            );

            if (billResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Contingent bill not found",
                });
            }

            const itemResult = await db.query(
                `
                SELECT *
                FROM finance_contingent_bill_items
                WHERE "contingentBillId" = $1
                ORDER BY
                    "sortOrder" ASC,
                    id ASC
                `,
                [req.params.id]
            );

            res.json({
                ...billResult.rows[0],
                items: itemResult.rows,
            });

        } catch (err) {
            console.error(
                "GET /finance/contingent-bills/:id:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message,
            });
        }
    }
);

// ADD CONTINGENT BILL
router.post(
    "/contingent-bills",
    async (req, res) => {
        const client = await db.connect();

        try {
            const {
                farm,
                voucherNo,
                month,
                year,
                headId,
                paymentHead,
                paymentToMS,
                authority,
                totalAmount,
                amountInWords,
                chequeNo,
                chequeDate,
                receivedByName,
                receivedByRank,
                items,
            } = req.body;

            if (
                !paymentToMS ||
                !String(paymentToMS).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Payment to M/S is required",
                });
            }

            let parsedItems;

            try {
                parsedItems =
                    typeof items === "string"
                        ? JSON.parse(items)
                        : items || [];
            } catch (err) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid items data",
                });
            }

            if (
                !Array.isArray(parsedItems) ||
                parsedItems.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "At least one bill row is required",
                });
            }

            await client.query("BEGIN");

            const billResult =
                await client.query(
                    `
                    INSERT INTO finance_contingent_bills
                    (
                        farm,
                        "voucherNo",
                        month,
                        year,
                        "headId",
                        "paymentHead",
                        "paymentToMS",
                        authority,
                        "totalAmount",
                        "amountInWords",
                        "chequeNo",
                        "chequeDate",
                        "receivedByName",
                        "receivedByRank"
                    )
                    VALUES
                    (
                        $1,$2,$3,$4,$5,$6,$7,
                        $8,$9,$10,$11,$12,$13,$14
                    )
                    RETURNING id
                    `,
                    [
                        farm || null,
                        voucherNo || "",
                        month || "",
                        year || "",
                        headId || null,
                        paymentHead || "",
                        String(
                            paymentToMS
                        ).trim(),
                        authority || "",
                        num(totalAmount),
                        amountInWords || "",
                        chequeNo || "",
                        chequeDate || "",
                        receivedByName || "",
                        receivedByRank || "",
                    ]
                );

            const billId =
                billResult.rows[0].id;

            for (
                let index = 0;
                index < parsedItems.length;
                index++
            ) {
                const item =
                    parsedItems[index] || {};

                await client.query(
                    `
                    INSERT INTO finance_contingent_bill_items
                    (
                        "contingentBillId",
                        "billNo",
                        "billDate",
                        description,
                        amount,
                        "sortOrder"
                    )
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [
                        billId,
                        item.billNo || "",
                        item.billDate || "",
                        item.description || "",
                        num(item.amount),
                        index,
                    ]
                );
            }

            await client.query("COMMIT");

            res.json({
                success: true,
                message:
                    "Contingent bill added successfully",
                id: billId,
            });

        } catch (err) {
            await client.query("ROLLBACK");

            console.error(
                "POST /finance/contingent-bills:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message,
            });

        } finally {
            client.release();
        }
    }
);

// UPDATE CONTINGENT BILL
router.put(
    "/contingent-bills/:id",
    async (req, res) => {
        const client = await db.connect();

        try {
            const {
                voucherNo,
                month,
                year,
                headId,
                paymentHead,
                paymentToMS,
                authority,
                totalAmount,
                amountInWords,
                chequeNo,
                chequeDate,
                receivedByName,
                receivedByRank,
                items,
            } = req.body;

            const oldResult =
                await client.query(
                    `
                    SELECT *
                    FROM finance_contingent_bills
                    WHERE id = $1
                    `,
                    [req.params.id]
                );

            if (oldResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Contingent bill not found",
                });
            }

            const row =
                oldResult.rows[0];

            let parsedItems = null;

            if (items !== undefined) {
                try {
                    parsedItems =
                        typeof items === "string"
                            ? JSON.parse(items)
                            : items;
                } catch (err) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid items data",
                    });
                }

                if (
                    !Array.isArray(parsedItems) ||
                    parsedItems.length === 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "At least one bill row is required",
                    });
                }
            }

            const finalPaymentToMS =
                String(
                    paymentToMS ??
                        row.paymentToMS ??
                        ""
                ).trim();

            if (!finalPaymentToMS) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Payment to M/S is required",
                });
            }

            await client.query("BEGIN");

            await client.query(
                `
                UPDATE finance_contingent_bills
                SET
                    "voucherNo" = $1,
                    month = $2,
                    year = $3,
                    "headId" = $4,
                    "paymentHead" = $5,
                    "paymentToMS" = $6,
                    authority = $7,
                    "totalAmount" = $8,
                    "amountInWords" = $9,
                    "chequeNo" = $10,
                    "chequeDate" = $11,
                    "receivedByName" = $12,
                    "receivedByRank" = $13,
                    "updatedAt" = CURRENT_TIMESTAMP
                WHERE id = $14
                `,
                [
                    voucherNo ??
                        row.voucherNo ??
                        "",
                    month ??
                        row.month ??
                        "",
                    year ??
                        row.year ??
                        "",
                    headId ??
                        row.headId ??
                        null,
                    paymentHead ??
                        row.paymentHead ??
                        "",
                    finalPaymentToMS,
                    authority ??
                        row.authority ??
                        "",
                    totalAmount !== undefined
                        ? num(totalAmount)
                        : num(row.totalAmount),
                    amountInWords ??
                        row.amountInWords ??
                        "",
                    chequeNo ??
                        row.chequeNo ??
                        "",
                    chequeDate ??
                        row.chequeDate ??
                        "",
                    receivedByName ??
                        row.receivedByName ??
                        "",
                    receivedByRank ??
                        row.receivedByRank ??
                        "",
                    req.params.id,
                ]
            );

            if (parsedItems !== null) {
                await client.query(
                    `
                    DELETE FROM finance_contingent_bill_items
                    WHERE "contingentBillId" = $1
                    `,
                    [req.params.id]
                );

                for (
                    let index = 0;
                    index < parsedItems.length;
                    index++
                ) {
                    const item =
                        parsedItems[index] || {};

                    await client.query(
                        `
                        INSERT INTO finance_contingent_bill_items
                        (
                            "contingentBillId",
                            "billNo",
                            "billDate",
                            description,
                            amount,
                            "sortOrder"
                        )
                        VALUES ($1,$2,$3,$4,$5,$6)
                        `,
                        [
                            req.params.id,
                            item.billNo || "",
                            item.billDate || "",
                            item.description || "",
                            num(item.amount),
                            index,
                        ]
                    );
                }
            }

            await client.query("COMMIT");

            res.json({
                success: true,
                message:
                    "Contingent bill updated successfully",
            });

        } catch (err) {
            await client.query("ROLLBACK");

            console.error(
                "PUT /finance/contingent-bills:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message,
            });

        } finally {
            client.release();
        }
    }
);

// DELETE CONTINGENT BILL
router.delete(
    "/contingent-bills/:id",
    async (req, res) => {
        const client = await db.connect();

        try {
            await client.query("BEGIN");

            await client.query(
                `
                DELETE FROM finance_contingent_bill_items
                WHERE "contingentBillId" = $1
                `,
                [req.params.id]
            );

            const result =
                await client.query(
                    `
                    DELETE FROM finance_contingent_bills
                    WHERE id = $1
                    `,
                    [req.params.id]
                );

            if (result.rowCount === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message:
                        "Contingent bill not found",
                });
            }

            await client.query("COMMIT");

            res.json({
                success: true,
                message:
                    "Contingent bill deleted successfully",
            });

        } catch (err) {
            await client.query("ROLLBACK");

            console.error(
                "DELETE /finance/contingent-bills:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message,
            });

        } finally {
            client.release();
        }
    }
);

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: friendlyUploadError(err),
        });
    }

    next();
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
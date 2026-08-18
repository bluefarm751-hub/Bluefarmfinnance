const express = require("express");
const router = express.Router();

const db = require("../database/database");
const { buildSourceTag } = require("../utils/sourceTag");

// ============================================================
// CASH BOOK - COMPLETE POSTGRESQL VERSION
// ============================================================

const SAFE_LIMIT = 500000;

// ============================================================
// HELPERS
// ============================================================

const num = (value) => {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

const round2 = (value) => {
    return Math.round(num(value) * 100) / 100;
};

const moneyFmt = (value) => {
    return `Rs. ${num(value).toLocaleString("en-PK")}`;
};

const isBank = (mode) => {
    const m = String(mode || "").trim().toLowerCase();

    return (
        m.includes("bank") ||
        m.includes("cheque") ||
        m.includes("check") ||
        m.includes("transfer") ||
        m.includes("online") ||
        m.includes("rtgs") ||
        m.includes("ibft")
    );
};

// ============================================================
// POSTGRESQL HELPERS
// ============================================================

async function all(sql, params = []) {
    const result = await db.query(sql, params);
    return result.rows || [];
}

async function run(sql, params = []) {
    return db.query(sql, params);
}

// ============================================================
// DATE HELPERS
// ============================================================

function normalizeDate(value) {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

// ============================================================
// FILTERS
// ============================================================

function applyFilters(rows, filters = {}) {
    const {
        from,
        to,
        farm,
        head
    } = filters;

    return rows
        .filter((r) => {
            if (!from) return true;

            return (
                normalizeDate(r.date) >=
                String(from)
            );
        })
        .filter((r) => {
            if (!to) return true;

            return (
                normalizeDate(r.date) <=
                String(to)
            );
        })
        .filter((r) => {
            if (!farm) return true;

            return (
                String(r.farm || "") ===
                String(farm)
            );
        })
        .filter((r) => {
            if (!head) return true;

            return (
                String(r.head || "") ===
                String(head)
            );
        })
        .sort((a, b) => {
            const dateCompare =
                normalizeDate(a.date).localeCompare(
                    normalizeDate(b.date)
                );

            if (dateCompare !== 0) {
                return dateCompare;
            }

            return String(
                a.voucherNo || ""
            ).localeCompare(
                String(b.voucherNo || "")
            );
        });
}

// ============================================================
// CONTRA ENTRIES
// ============================================================

async function contraLegs() {

    const withdrawals = await all(`
        SELECT
            id,
            farm,
            "entryDate",
            "voucherNo",
            "chequeNo",
            amount,
            "withdrawnBy",
            remarks,
            "sourceTag"
        FROM cash_withdrawals
        ORDER BY "entryDate" ASC, id ASC
    `);

    const deposits = await all(`
        SELECT
            id,
            farm,
            "entryDate",
            "voucherNo",
            amount,
            "depositedBy",
            head,
            remarks,
            "sourceTag"
        FROM bank_deposits
        ORDER BY "entryDate" ASC, id ASC
    `);

    const receiptLegs = [];
    const paymentLegs = [];

    // ========================================================
    // CASH WITHDRAWAL
    // Cash increases
    // Bank decreases
    // ========================================================

    withdrawals.forEach((w) => {

        const amount = round2(w.amount);

        const tag =
            w.sourceTag ||
            buildSourceTag(
                w.farm,
                "CONTRA"
            );

        const base = {
            voucherNo:
                w.voucherNo ||
                `CW-${w.id}`,

            party:
                "Contra Entry",

            description:
                w.remarks
                    ? `Cash Withdrawn from Bank — ${w.remarks}`
                    : "Cash Withdrawn from Bank",

            date:
                normalizeDate(
                    w.entryDate
                ),

            head:
                "C#",

            source:
                "Contra Entry",

            sourceTag:
                tag,

            farm:
                w.farm || "",

            auto:
                true
        };

        // Cash receipt
        receiptLegs.push({
            id:
                `CW-R-${w.id}`,

            ...base,

            cash:
                amount,

            bank:
                0
        });

        // Bank payment
        paymentLegs.push({
            id:
                `CW-P-${w.id}`,

            ...base,

            cash:
                0,

            bank:
                amount
        });
    });

    // ========================================================
    // BANK DEPOSIT
    // Bank increases
    // Cash decreases
    // ========================================================

    deposits.forEach((d) => {

        const amount = round2(d.amount);

        const tag =
            d.sourceTag ||
            buildSourceTag(
                d.farm,
                "CONTRA"
            );

        const base = {
            voucherNo:
                d.voucherNo ||
                `BD-${d.id}`,

            party:
                "Contra Entry",

            description:
                d.remarks
                    ? `Cash Deposited into Bank — ${d.remarks}`
                    : "Cash Deposited into Bank",

            date:
                normalizeDate(
                    d.entryDate
                ),

            head:
                "C#",

            source:
                "Contra Entry",

            sourceTag:
                tag,

            farm:
                d.farm || "",

            auto:
                true
        };

        // Bank receipt
        receiptLegs.push({
            id:
                `BD-R-${d.id}`,

            ...base,

            cash:
                0,

            bank:
                amount
        });

        // Cash payment
        paymentLegs.push({
            id:
                `BD-P-${d.id}`,

            ...base,

            cash:
                amount,

            bank:
                0
        });
    });

    return {
        receiptLegs,
        paymentLegs
    };
}

// ============================================================
// RECEIPT ROWS
// ============================================================

async function receiptRows(filters = {}) {

    // --------------------------------------------------------
    // MANUAL RECEIPTS
    // --------------------------------------------------------

    const manual = await all(`
        SELECT
            id,
            farm,
            "entryDate",
            "voucherNo",
            party,
            description,
            head,
            source,
            "sourceTag",
            cash,
            bank
        FROM cashbook_receipts
        ORDER BY "entryDate" ASC, id ASC
    `);

    // --------------------------------------------------------
    // ALLOCATIONS
    // --------------------------------------------------------

    const allocations = await all(`
        SELECT
            a.id,
            a."allocationDate",
            a."headId",
            a.amount,
            a."letterReference",
            h."headName",
            h.farm AS "headFarm"
        FROM finance_allocations a
        LEFT JOIN finance_heads h
            ON h.id = a."headId"
        ORDER BY
            a."allocationDate" ASC,
            a.id ASC
    `);

    const allocByKey = {};

    allocations.forEach((a) => {

        const date =
            normalizeDate(
                a.allocationDate
            );

        const headId =
            a.headId || "";

        const key =
            `alloc-${date}-${headId}`;

        if (!allocByKey[key]) {

            allocByKey[key] = {
                date,

                headName:
                    a.headName || "",

                farm:
                    a.farm ||
                    a.headFarm ||
                    "",

                amount:
                    0,

                refs:
                    []
            };
        }

        allocByKey[key].amount =
            round2(
                allocByKey[key].amount +
                num(a.amount)
            );

        if (a.letterReference) {
            allocByKey[key].refs.push(
                a.letterReference
            );
        }
    });

    // --------------------------------------------------------
    // CONTRA
    // --------------------------------------------------------

    const {
        receiptLegs
    } = await contraLegs();

    // --------------------------------------------------------
    // BUILD RECEIPT ROWS
    // --------------------------------------------------------

    const rows = [

        // ----------------------------------------------------
        // BUDGET ALLOCATIONS
        // ----------------------------------------------------

        ...Object.values(
            allocByKey
        ).map((a, i) => ({
            id:
                `A-${a.date}-${i}`,

            date:
                a.date,

            voucherNo:
                a.refs.length
                    ? a.refs.join(", ")
                    : `ALLOC-${a.date}`,

            party:
                "Budget Allocation",

            description:
                `Allocation for ${a.headName}`,

            head:
                a.headName,

            source:
                "Budget Allocation",

            sourceTag:
                buildSourceTag(
                    a.farm,
                    "ALLOCATION"
                ),

            farm:
                a.farm || "",

            cash:
                0,

            bank:
                round2(a.amount),

            auto:
                true
        })),

        // ----------------------------------------------------
        // MANUAL RECEIPTS
        // ----------------------------------------------------

        ...manual.map((r) => ({
            id:
                `R-${r.id}`,

            rawId:
                r.id,

            date:
                normalizeDate(
                    r.entryDate
                ),

            voucherNo:
                r.voucherNo ||
                `RV-${r.id}`,

            party:
                r.party || "",

            description:
                r.description || "",

            head:
                r.head ||
                r.source ||
                "",

            source:
                r.source ||
                "Other",

            sourceTag:
                r.sourceTag ||
                buildSourceTag(
                    r.farm,
                    "INCOME"
                ),

            farm:
                r.farm || "",

            cash:
                round2(r.cash),

            bank:
                round2(r.bank),

            auto:
                false
        })),

        // ----------------------------------------------------
        // CONTRA RECEIPTS
        // ----------------------------------------------------

        ...receiptLegs
    ];

    return applyFilters(
        rows,
        filters
    );
}

// ============================================================
// PAYMENT ROWS
// ============================================================

async function paymentRows(filters = {}) {

    // --------------------------------------------------------
    // FINANCE BILLS
    // --------------------------------------------------------

    const bills = await all(`
        SELECT
            b.*,
            h."headName"
        FROM finance_bills b
        LEFT JOIN finance_heads h
            ON h.id = b."headId"
        ORDER BY
            b."billDate" ASC,
            b.id ASC
    `);

    const rows =
        bills.map((b) => {

            const paymentMode =
                b.paymentMode ||
                b.paymentmode ||
                "";

            const amount =
                round2(b.amount);

            const cashPayment =
                !isBank(paymentMode);

            return {

                id:
                    `B-${b.id}`,

                date:
                    normalizeDate(
                        b.billDate ||
                        b.billdate
                    ),

                voucherNo:
                    b.sNo ||
                    b.sno
                        ? `BILL-${b.sNo || b.sno}`
                        : `BILL-${b.id}`,

                party:
                    b.contractorName ||
                    b.contractorname ||
                    "",

                description:
                    b.item ||
                    b.remarks ||
                    "",

                head:
                    b.headName ||
                    "",

                source:
                    cashPayment
                        ? "Cash Bill"
                        : "Bank Transfer Bill",

                sourceTag:
                    b.sourceTag ||
                    b.sourcetag ||
                    buildSourceTag(
                        b.farm,
                        "BILL"
                    ),

                farm:
                    b.farm || "",

                cash:
                    cashPayment
                        ? amount
                        : 0,

                bank:
                    cashPayment
                        ? 0
                        : amount,

                auto:
                    true
            };
        });

    // --------------------------------------------------------
    // HEAD OFFICE REMITTANCES
    // --------------------------------------------------------

    const hoRemittances =
        await all(`
            SELECT
                *
            FROM ho_remittances
            ORDER BY
                "entryDate" ASC,
                id ASC
        `);

    const hoRows =
        hoRemittances.map((r) => ({

            id:
                `HO-${r.id}`,

            date:
                normalizeDate(
                    r.entryDate ||
                    r.entrydate
                ),

            voucherNo:
                r.voucherNo ||
                r.voucherno ||
                `HOR-${r.id}`,

            party:
                "Head Office",

            description:
                r.remarks ||
                `HO Remittance (${r.transferMode || r.transfermode || "RTGS"})`,

            head:
                "HO Remittance",

            source:
                "HO Remittance",

            sourceTag:
                buildSourceTag(
                    r.farm,
                    "HO REMITTANCE"
                ),

            farm:
                r.farm || "",

            cash:
                0,

            bank:
                round2(r.amount),

            auto:
                true
        }));

    // --------------------------------------------------------
    // CONTRA PAYMENTS
    // --------------------------------------------------------

    const {
        paymentLegs
    } = await contraLegs();

    return applyFilters(
        [
            ...rows,
            ...hoRows,
            ...paymentLegs
        ],
        filters
    );
}

// ============================================================
// GET RECEIPTS
// ============================================================

router.get("/receipts", async (req, res) => {

    try {

        const rows =
            await receiptRows(
                req.query
            );

        res.json(rows);

    } catch (error) {

        console.error(
            "GET RECEIPTS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// ADD RECEIPT
// ============================================================

router.post("/receipts", async (req, res) => {

    try {

        const {
            farm,
            entryDate,
            voucherNo,
            party,
            description,
            head,
            source,
            cash,
            bank
        } = req.body;

        const cashAmount =
            round2(cash);

        const bankAmount =
            round2(bank);

        if (
            cashAmount <= 0 &&
            bankAmount <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Cash or bank amount is required."
            });
        }

        const sourceTag =
            buildSourceTag(
                farm,
                "INCOME"
            );

        const result =
            await db.query(
                `
                INSERT INTO cashbook_receipts
                (
                    farm,
                    "entryDate",
                    "voucherNo",
                    party,
                    description,
                    head,
                    source,
                    "sourceTag",
                    cash,
                    bank
                )
                VALUES
                (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10
                )
                RETURNING id
                `,
                [
                    farm || null,
                    entryDate || null,
                    voucherNo || "",
                    party || "",
                    description || "",
                    head || "",
                    source || "Other",
                    sourceTag,
                    cashAmount,
                    bankAmount
                ]
            );

        res.json({
            success: true,
            message:
                "Receipt added successfully",
            id:
                result.rows[0].id,
            sourceTag
        });

    } catch (error) {

        console.error(
            "ADD RECEIPT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// DELETE RECEIPT
// ============================================================

router.delete("/receipts/:id", async (req, res) => {

    try {

        const result =
            await db.query(
                `
                DELETE FROM cashbook_receipts
                WHERE id=$1
                `,
                [req.params.id]
            );

        if (result.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Receipt not found."
            });
        }

        res.json({
            success: true,
            message:
                "Receipt deleted successfully."
        });

    } catch (error) {

        console.error(
            "DELETE RECEIPT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// GET PAYMENTS
// ============================================================

router.get("/payments", async (req, res) => {

    try {

        const rows =
            await paymentRows(
                req.query
            );

        res.json(rows);

    } catch (error) {

        console.error(
            "GET PAYMENTS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// WITHDRAWALS
// ============================================================

router.get("/withdrawals", async (req, res) => {

    try {

        const {
            from,
            to,
            farm
        } = req.query;

        let rows = await all(`
            SELECT *
            FROM cash_withdrawals
            ORDER BY
                "entryDate" ASC,
                id ASC
        `);

        rows = rows.filter((r) => {

            const date =
                normalizeDate(
                    r.entryDate
                );

            if (
                from &&
                date < String(from)
            ) {
                return false;
            }

            if (
                to &&
                date > String(to)
            ) {
                return false;
            }

            if (
                farm &&
                String(r.farm || "") !==
                String(farm)
            ) {
                return false;
            }

            return true;
        });

        res.json(rows);

    } catch (error) {

        console.error(
            "GET WITHDRAWALS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// ADD WITHDRAWAL
// ============================================================

router.post("/withdrawals", async (req, res) => {

    try {

        const {
            farm,
            entryDate,
            voucherNo,
            chequeNo,
            amount,
            withdrawnBy,
            remarks
        } = req.body;

        const amt =
            round2(amount);

        if (amt <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Amount is required."
            });
        }

        const bal =
            await balances();

        if (
            amt >
            bal.cashInBank
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Withdrawal exceeds available bank balance. Available: ${moneyFmt(bal.cashInBank)}.`
            });
        }

        if (
            bal.cashInHand + amt >
            SAFE_LIMIT
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Office safe limit is ${moneyFmt(SAFE_LIMIT)}. Cash in hand would become ${moneyFmt(bal.cashInHand + amt)}.`
            });
        }

        const sourceTag =
            buildSourceTag(
                farm,
                "CONTRA"
            );

        const result =
            await db.query(
                `
                INSERT INTO cash_withdrawals
                (
                    farm,
                    "entryDate",
                    "voucherNo",
                    "chequeNo",
                    amount,
                    "withdrawnBy",
                    remarks,
                    "sourceTag"
                )
                VALUES
                (
                    $1,$2,$3,$4,
                    $5,$6,$7,$8
                )
                RETURNING id
                `,
                [
                    farm || null,
                    entryDate || null,
                    voucherNo || "",
                    chequeNo || "",
                    amt,
                    withdrawnBy || "",
                    remarks || "",
                    sourceTag
                ]
            );

        res.json({
            success: true,
            message:
                "Cash withdrawal recorded successfully.",
            id:
                result.rows[0].id,
            sourceTag
        });

    } catch (error) {

        console.error(
            "ADD WITHDRAWAL ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// DELETE WITHDRAWAL
// ============================================================

router.delete("/withdrawals/:id", async (req, res) => {

    try {

        const result =
            await db.query(
                `
                DELETE FROM cash_withdrawals
                WHERE id=$1
                `,
                [req.params.id]
            );

        if (result.rowCount === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Withdrawal not found."
            });
        }

        res.json({
            success: true,
            message:
                "Withdrawal deleted successfully."
        });

    } catch (error) {

        console.error(
            "DELETE WITHDRAWAL ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// TEMPORARY RECEIPTS - GET
// ============================================================

router.get("/trs", async (req, res) => {

    try {

        const {
            from,
            to,
            farm,
            status
        } = req.query;

        let rows = await all(`
            SELECT *
            FROM temporary_receipts
            ORDER BY
                "entryDate" ASC,
                id ASC
        `);

        rows = rows.filter((r) => {

            const date =
                normalizeDate(
                    r.entryDate
                );

            if (
                from &&
                date < String(from)
            ) {
                return false;
            }

            if (
                to &&
                date > String(to)
            ) {
                return false;
            }

            if (
                farm &&
                String(r.farm || "") !==
                String(farm)
            ) {
                return false;
            }

            if (
                status &&
                String(r.status || "") !==
                String(status)
            ) {
                return false;
            }

            return true;
        });

        res.json(rows);

    } catch (error) {

        console.error(
            "GET TRS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// ADD TEMPORARY RECEIPT
// ============================================================

router.post("/trs", async (req, res) => {

    try {

        const {
            farm,
            entryDate,
            description,
            issuedTo,
            amount,
            authority,
            status
        } = req.body;

        const amt =
            round2(amount);

        if (amt <= 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Amount is required."
            });
        }

        const bal =
            await balances();

        if (
            amt >
            bal.cashInHand
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `Insufficient cash in hand. Available: ${moneyFmt(bal.cashInHand)}.`
            });
        }

        const nextRows =
            await all(`
                SELECT
                    COALESCE(
                        MAX("sNo"),
                        0
                    ) + 1 AS "nextNo"
                FROM temporary_receipts
            `);

        const sNo =
            Number(
                nextRows[0]?.nextNo || 1
            );

        const result =
            await db.query(
                `
                INSERT INTO temporary_receipts
                (
                    farm,
                    "sNo",
                    "entryDate",
                    description,
                    "issuedTo",
                    amount,
                    authority,
                    status
                )
                VALUES
                (
                    $1,$2,$3,$4,
                    $5,$6,$7,$8
                )
                RETURNING id
                `,
                [
                    farm || null,
                    sNo,
                    entryDate || null,
                    description || "",
                    issuedTo || "",
                    amt,
                    authority || "",
                    status || "Not Cleared"
                ]
            );

        res.json({
            success: true,
            message:
                "Temporary receipt issued successfully.",
            id:
                result.rows[0].id,
            sNo
        });

    } catch (error) {

        console.error(
            "ADD TR ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// UPDATE TEMPORARY RECEIPT
// ============================================================

router.put("/trs/:id", async (req, res) => {

    try {

        const existing =
            await all(
                `
                SELECT *
                FROM temporary_receipts
                WHERE id=$1
                `,
                [req.params.id]
            );

        if (existing.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Temporary receipt not found."
            });
        }

        const old =
            existing[0];

        const {
            description,
            issuedTo,
            amount,
            authority,
            status,
            entryDate
        } = req.body;

        const newAmount =
            amount !== undefined
                ? round2(amount)
                : round2(old.amount);

        const newStatus =
            status ||
            old.status ||
            "Not Cleared";

        let clearedDate = null;

        if (
            newStatus === "Cleared"
        ) {
            clearedDate =
                new Date()
                    .toISOString()
                    .slice(0, 10);
        }

        const result =
            await db.query(
                `
                UPDATE temporary_receipts
                SET
                    "entryDate"=$1,
                    description=$2,
                    "issuedTo"=$3,
                    amount=$4,
                    authority=$5,
                    status=$6,
                    "clearedDate"=$7
                WHERE id=$8
                `,
                [
                    entryDate ||
                        old.entryDate ||
                        null,

                    description ??
                        old.description ??
                        "",

                    issuedTo ??
                        old.issuedTo ??
                        "",

                    newAmount,

                    authority ??
                        old.authority ??
                        "",

                    newStatus,

                    clearedDate,

                    req.params.id
                ]
            );

        if (
            result.rowCount === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Temporary receipt not found."
            });
        }

        res.json({
            success: true,
            message:
                "Temporary receipt updated successfully."
        });

    } catch (error) {

        console.error(
            "UPDATE TR ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// DELETE TEMPORARY RECEIPT
// ============================================================

router.delete("/trs/:id", async (req, res) => {

    try {

        const result =
            await db.query(
                `
                DELETE FROM temporary_receipts
                WHERE id=$1
                `,
                [req.params.id]
            );

        if (
            result.rowCount === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Temporary receipt not found."
            });
        }

        res.json({
            success: true,
            message:
                "Temporary receipt deleted successfully."
        });

    } catch (error) {

        console.error(
            "DELETE TR ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// BALANCES
// ============================================================

async function balances(upto) {

    const cut = (date) => {

        if (!upto) {
            return true;
        }

        return (
            normalizeDate(date) <=
            String(upto)
        );
    };

    const receipts =
        (await receiptRows())
            .filter((r) =>
                cut(r.date)
            );

    const payments =
        (await paymentRows())
            .filter((r) =>
                cut(r.date)
            );

    const withdrawals =
        (await all(`
            SELECT *
            FROM cash_withdrawals
        `))
            .filter((r) =>
                cut(r.entryDate)
            );

    const bankDeposits =
        (await all(`
            SELECT *
            FROM bank_deposits
        `))
            .filter((r) =>
                cut(r.entryDate)
            );

    const hoRemittances =
        (await all(`
            SELECT *
            FROM ho_remittances
        `))
            .filter((r) =>
                cut(r.entryDate)
            );

    const trs =
        (await all(`
            SELECT *
            FROM temporary_receipts
        `))
            .filter((r) =>
                cut(r.entryDate)
            );

    const sum =
        (array, key) =>
            array.reduce(
                (total, row) =>
                    total +
                    num(row[key]),
                0
            );

    const receiptBank =
        round2(
            sum(
                receipts,
                "bank"
            )
        );

    const receiptCash =
        round2(
            sum(
                receipts,
                "cash"
            )
        );

    const paymentBank =
        round2(
            sum(
                payments,
                "bank"
            )
        );

    const paymentCash =
        round2(
            sum(
                payments,
                "cash"
            )
        );

    const totalWithdrawn =
        round2(
            sum(
                withdrawals,
                "amount"
            )
        );

    const totalBankDeposited =
        round2(
            sum(
                bankDeposits,
                "amount"
            )
        );

    const trOutstanding =
        round2(
            sum(
                trs.filter(
                    (t) =>
                        String(
                            t.status || ""
                        ).toLowerCase() !==
                        "cleared"
                ),
                "amount"
            )
        );

    const trIssued =
        round2(
            sum(
                trs,
                "amount"
            )
        );

    const totalHoRemitted =
        round2(
            sum(
                hoRemittances,
                "amount"
            )
        );

    const cashInBank =
        round2(
            receiptBank -
            paymentBank
        );

    const cashInHand =
        round2(
            receiptCash -
            paymentCash -
            trOutstanding
        );

    return {

        cashInBank,

        cashInHand,

        trOutstanding,

        trIssued,

        totalHoRemitted,

        totalBankDeposited,

        totalBalance:
            round2(
                cashInBank +
                cashInHand +
                trOutstanding
            ),

        receiptBank,

        receiptCash,

        paymentBank,

        paymentCash,

        totalWithdrawn,

        safeLimit:
            SAFE_LIMIT
    };
}

// ============================================================
// SUMMARY
// ============================================================

router.get("/summary", async (req, res) => {

    try {

        const result =
            await balances(
                req.query.upto
            );

        res.json(result);

    } catch (error) {

        console.error(
            "SUMMARY ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// DAILY CLOSING SUMMARY
// ============================================================

router.get(
    "/closing-summary",
    async (req, res) => {

        try {

            const date =
                req.query.date ||
                new Date()
                    .toISOString()
                    .slice(0, 10);

            const b =
                await balances(date);

            const expectedCash =
                round2(
                    b.receiptCash -
                    b.paymentCash -
                    b.trOutstanding
                );

            res.json({

                date,

                totalWithdrawn:
                    b.totalWithdrawn,

                cashReceipts:
                    b.receiptCash,

                cashBills:
                    b.paymentCash,

                trIssued:
                    b.trOutstanding,

                expectedCash,

                safeLimit:
                    SAFE_LIMIT
            });

        } catch (error) {

            console.error(
                "CLOSING SUMMARY ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// GET DAILY CLOSINGS
// ============================================================

router.get("/closings", async (req, res) => {

    try {

        const {
            from,
            to
        } = req.query;

        let rows = await all(`
            SELECT *
            FROM daily_closings
            ORDER BY
                "closingDate" DESC,
                id DESC
        `);

        rows = rows.filter((r) => {

            const date =
                normalizeDate(
                    r.closingDate
                );

            if (
                from &&
                date < String(from)
            ) {
                return false;
            }

            if (
                to &&
                date > String(to)
            ) {
                return false;
            }

            return true;
        });

        res.json(rows);

    } catch (error) {

        console.error(
            "GET CLOSINGS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// SAVE DAILY CLOSING
// ============================================================

router.post("/closings", async (req, res) => {

    try {

        const {
            farm,
            closingDate,
            actualCash,
            denominations,
            remarks
        } = req.body;

        const date =
            closingDate ||
            new Date()
                .toISOString()
                .slice(0, 10);

        const b =
            await balances(date);

        const expectedCash =
            round2(
                b.receiptCash -
                b.paymentCash -
                b.trOutstanding
            );

        const actual =
            round2(actualCash);

        const difference =
            round2(
                actual -
                expectedCash
            );

        const status =
            difference === 0
                ? "Balanced"
                : difference > 0
                    ? "Excess"
                    : "Shortage";

        await db.query(
            `
            DELETE FROM daily_closings
            WHERE "closingDate"=$1
            `,
            [date]
        );

        const result =
            await db.query(
                `
                INSERT INTO daily_closings
                (
                    farm,
                    "closingDate",
                    "totalWithdrawn",
                    "cashBills",
                    "trIssued",
                    "expectedCash",
                    "actualCash",
                    difference,
                    status,
                    denominations,
                    remarks
                )
                VALUES
                (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10,$11
                )
                RETURNING id
                `,
                [
                    farm || null,
                    date,
                    b.totalWithdrawn,
                    b.paymentCash,
                    b.trOutstanding,
                    expectedCash,
                    actual,
                    difference,
                    status,
                    JSON.stringify(
                        denominations || {}
                    ),
                    remarks || ""
                ]
            );

        res.json({

            success:
                true,

            message:
                `Daily closing saved (${status})`,

            id:
                result.rows[0].id,

            status,

            difference,

            expectedCash
        });

    } catch (error) {

        console.error(
            "SAVE CLOSING ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// DELETE DAILY CLOSING
// ============================================================

router.delete(
    "/closings/:id",
    async (req, res) => {

        try {

            const result =
                await db.query(
                    `
                    DELETE FROM daily_closings
                    WHERE id=$1
                    `,
                    [req.params.id]
                );

            if (
                result.rowCount === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Closing not found."
                });
            }

            res.json({
                success: true,
                message:
                    "Closing deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE CLOSING ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// CASH BOOK STATEMENT
// ============================================================

router.get("/statement", async (req, res) => {

    try {

        const receipts =
            (
                await receiptRows(
                    req.query
                )
            ).map((r) => ({
                ...r,
                type:
                    "Receipt"
            }));

        const payments =
            (
                await paymentRows(
                    req.query
                )
            ).map((r) => ({
                ...r,
                type:
                    "Payment"
            }));

        const rows =
            [
                ...receipts,
                ...payments
            ].sort((a, b) => {

                const dateCompare =
                    normalizeDate(
                        a.date
                    ).localeCompare(
                        normalizeDate(
                            b.date
                        )
                    );

                if (
                    dateCompare !== 0
                ) {
                    return dateCompare;
                }

                return String(
                    a.voucherNo || ""
                ).localeCompare(
                    String(
                        b.voucherNo || ""
                    )
                );
            });

        let cash = 0;
        let bank = 0;

        const statement =
            rows.map((r) => {

                if (
                    r.type ===
                    "Receipt"
                ) {

                    cash +=
                        num(r.cash);

                    bank +=
                        num(r.bank);

                } else {

                    cash -=
                        num(r.cash);

                    bank -=
                        num(r.bank);
                }

                return {

                    ...r,

                    cashBalance:
                        round2(cash),

                    bankBalance:
                        round2(bank)
                };
            });

        const withdrawals =
            await all(`
                SELECT *
                FROM cash_withdrawals
                ORDER BY
                    "entryDate" ASC,
                    id ASC
            `);

        res.json({
            statement,
            withdrawals
        });

    } catch (error) {

        console.error(
            "STATEMENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// BANK DEPOSITS - GET
// ============================================================

router.get(
    "/bank-deposits",
    async (req, res) => {

        try {

            const {
                from,
                to,
                farm
            } = req.query;

            let rows = await all(`
                SELECT *
                FROM bank_deposits
                ORDER BY
                    "entryDate" DESC,
                    id DESC
            `);

            rows = rows.filter((r) => {

                const date =
                    normalizeDate(
                        r.entryDate
                    );

                if (
                    from &&
                    date < String(from)
                ) {
                    return false;
                }

                if (
                    to &&
                    date > String(to)
                ) {
                    return false;
                }

                if (
                    farm &&
                    String(r.farm || "") !==
                    String(farm)
                ) {
                    return false;
                }

                return true;
            });

            res.json(rows);

        } catch (error) {

            console.error(
                "GET BANK DEPOSITS ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// ADD BANK DEPOSIT
// ============================================================

router.post(
    "/bank-deposits",
    async (req, res) => {

        try {

            const {
                farm,
                entryDate,
                voucherNo,
                amount,
                depositedBy,
                head,
                remarks
            } = req.body;

            const amt =
                round2(amount);

            if (amt <= 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Amount is required."
                });
            }

            const bal =
                await balances();

            if (
                amt >
                bal.cashInHand
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Insufficient cash in hand. Available: ${moneyFmt(bal.cashInHand)}, requested: ${moneyFmt(amt)}.`
                });
            }

            const sourceTag =
                buildSourceTag(
                    farm,
                    "CONTRA"
                );

            const result =
                await db.query(
                    `
                    INSERT INTO bank_deposits
                    (
                        farm,
                        "entryDate",
                        "voucherNo",
                        amount,
                        "depositedBy",
                        head,
                        remarks,
                        "sourceTag"
                    )
                    VALUES
                    (
                        $1,$2,$3,$4,
                        $5,$6,$7,$8
                    )
                    RETURNING id
                    `,
                    [
                        farm || null,
                        entryDate || null,
                        voucherNo || "",
                        amt,
                        depositedBy || "",
                        head || "Milk Sale",
                        remarks || "",
                        sourceTag
                    ]
                );

            res.json({

                success:
                    true,

                message:
                    "Bank deposit recorded successfully.",

                id:
                    result.rows[0].id,

                sourceTag
            });

        } catch (error) {

            console.error(
                "ADD BANK DEPOSIT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// DELETE BANK DEPOSIT
// ============================================================

router.delete(
    "/bank-deposits/:id",
    async (req, res) => {

        try {

            const result =
                await db.query(
                    `
                    DELETE FROM bank_deposits
                    WHERE id=$1
                    `,
                    [req.params.id]
                );

            if (
                result.rowCount === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Bank deposit not found."
                });
            }

            res.json({
                success: true,
                message:
                    "Bank deposit deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE BANK DEPOSIT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// HEAD OFFICE REMITTANCES - GET
// ============================================================

router.get(
    "/ho-remittances",
    async (req, res) => {

        try {

            const {
                from,
                to,
                farm
            } = req.query;

            let rows = await all(`
                SELECT *
                FROM ho_remittances
                ORDER BY
                    "entryDate" DESC,
                    id DESC
            `);

            rows = rows.filter((r) => {

                const date =
                    normalizeDate(
                        r.entryDate
                    );

                if (
                    from &&
                    date < String(from)
                ) {
                    return false;
                }

                if (
                    to &&
                    date > String(to)
                ) {
                    return false;
                }

                if (
                    farm &&
                    String(r.farm || "") !==
                    String(farm)
                ) {
                    return false;
                }

                return true;
            });

            res.json(rows);

        } catch (error) {

            console.error(
                "GET HO REMITTANCES ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// ADD HEAD OFFICE REMITTANCE
// ============================================================

router.post(
    "/ho-remittances",
    async (req, res) => {

        try {

            const {
                farm,
                entryDate,
                voucherNo,
                bankRef,
                transferMode,
                amount,
                remarks,
                attachment
            } = req.body;

            const amt =
                round2(amount);

            if (amt <= 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Amount is required."
                });
            }

            const bal =
                await balances();

            if (
                amt >
                bal.cashInBank
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Insufficient bank balance. Available: ${moneyFmt(bal.cashInBank)}, requested: ${moneyFmt(amt)}.`
                });
            }

            const result =
                await db.query(
                    `
                    INSERT INTO ho_remittances
                    (
                        farm,
                        "entryDate",
                        "voucherNo",
                        "bankRef",
                        "transferMode",
                        amount,
                        remarks,
                        attachment
                    )
                    VALUES
                    (
                        $1,$2,$3,$4,
                        $5,$6,$7,$8
                    )
                    RETURNING id
                    `,
                    [
                        farm || null,
                        entryDate || null,
                        voucherNo || "",
                        bankRef || "",
                        transferMode || "RTGS",
                        amt,
                        remarks || "",
                        attachment || ""
                    ]
                );

            res.json({

                success:
                    true,

                message:
                    "HO Remittance recorded successfully.",

                id:
                    result.rows[0].id
            });

        } catch (error) {

            console.error(
                "ADD HO REMITTANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// UPDATE HEAD OFFICE REMITTANCE
// ============================================================

router.put(
    "/ho-remittances/:id",
    async (req, res) => {

        try {

            const existing =
                await all(
                    `
                    SELECT *
                    FROM ho_remittances
                    WHERE id=$1
                    `,
                    [req.params.id]
                );

            if (
                existing.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Remittance not found."
                });
            }

            const old =
                existing[0];

            const {
                entryDate,
                voucherNo,
                bankRef,
                transferMode,
                amount,
                remarks,
                attachment
            } = req.body;

            const newAmount =
                amount !== undefined
                    ? round2(amount)
                    : round2(old.amount);

            if (newAmount <= 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Amount must be greater than zero."
                });
            }

            // Only check extra amount when
            // increasing the existing remittance.
            if (
                newAmount >
                num(old.amount)
            ) {

                const bal =
                    await balances();

                const effectiveBank =
                    bal.cashInBank +
                    num(old.amount);

                if (
                    newAmount >
                    effectiveBank
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            `Insufficient bank balance. Available: ${moneyFmt(effectiveBank)}.`
                    });
                }
            }

            const result =
                await db.query(
                    `
                    UPDATE ho_remittances
                    SET
                        "entryDate"=$1,
                        "voucherNo"=$2,
                        "bankRef"=$3,
                        "transferMode"=$4,
                        amount=$5,
                        remarks=$6,
                        attachment=$7,
                        "updatedAt"=CURRENT_TIMESTAMP
                    WHERE id=$8
                    `,
                    [
                        entryDate ??
                            old.entryDate ??
                            null,

                        voucherNo ??
                            old.voucherNo ??
                            "",

                        bankRef ??
                            old.bankRef ??
                            "",

                        transferMode ??
                            old.transferMode ??
                            "RTGS",

                        newAmount,

                        remarks ??
                            old.remarks ??
                            "",

                        attachment ??
                            old.attachment ??
                            "",

                        req.params.id
                    ]
                );

            if (
                result.rowCount === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Remittance not found."
                });
            }

            res.json({
                success: true,
                message:
                    "HO Remittance updated successfully."
            });

        } catch (error) {

            console.error(
                "UPDATE HO REMITTANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// DELETE HEAD OFFICE REMITTANCE
// ============================================================

router.delete(
    "/ho-remittances/:id",
    async (req, res) => {

        try {

            const result =
                await db.query(
                    `
                    DELETE FROM ho_remittances
                    WHERE id=$1
                    `,
                    [req.params.id]
                );

            if (
                result.rowCount === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "HO Remittance not found."
                });
            }

            res.json({
                success: true,
                message:
                    "HO Remittance deleted successfully."
            });

        } catch (error) {

            console.error(
                "DELETE HO REMITTANCE ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ============================================================
// RESET CASH BOOK DATA
// ============================================================

router.post("/reset", async (req, res) => {

    try {

        await db.query(`
            DELETE FROM cashbook_receipts
        `);

        await db.query(`
            DELETE FROM cash_withdrawals
        `);

        await db.query(`
            DELETE FROM bank_deposits
        `);

        await db.query(`
            DELETE FROM temporary_receipts
        `);

        await db.query(`
            DELETE FROM daily_closings
        `);

        await db.query(`
            DELETE FROM ho_remittances
        `);

        res.json({

            success:
                true,

            message:
                "All cash book data cleared. Allocations and Bills remain untouched."
        });

    } catch (error) {

        console.error(
            "RESET CASH BOOK ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================
// EXPORT BALANCES
// ============================================================

module.exports = router;

module.exports.balances = balances;
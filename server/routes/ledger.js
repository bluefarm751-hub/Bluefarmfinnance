const express = require("express");
const router = express.Router();

const db = require("../database/database");

/**
 * ============================================================
 * LEDGER — GENERAL + PARTY
 * ============================================================
 *
 * AUTO ENTRIES:
 *   Finance Bills
 *   Cash Book Receipts
 *   Bank Deposits
 *   HQ Remittances
 *
 * MANUAL ENTRIES:
 *   ledger_entries
 *
 * Debit  = money received
 * Credit = money paid
 *
 * PostgreSQL version
 * ============================================================
 */

// ============================================================
// HELPERS
// ============================================================

const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const query = async (sql, params = []) => {
    const result = await db.query(sql, params);
    return result.rows || [];
};

const money = (v) => num(v);

const normalizeDate = (value) => {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
};

// ============================================================
// BUILD COMBINED LEDGER ROWS
// ============================================================

async function ledgerRows(filters = {}) {
    const {
        farm,
        from,
        to,
        party,
    } = filters;

    // --------------------------------------------------------
    // MANUAL ENTRIES
    // --------------------------------------------------------

    const manual = await query(`
        SELECT *
        FROM ledger_entries
        ORDER BY
            entryDate ASC NULLS LAST,
            id ASC
    `);

    // --------------------------------------------------------
    // FINANCE BILLS
    // --------------------------------------------------------

    const bills = await query(`
        SELECT
            b.*,
            h.headName AS "headName"
        FROM finance_bills b
        LEFT JOIN finance_heads h
            ON h.id = b."headId"
        ORDER BY
            b."billDate" ASC NULLS LAST,
            b.id ASC
    `);

    // --------------------------------------------------------
    // CASH BOOK RECEIPTS
    // --------------------------------------------------------

    const receipts = await query(`
        SELECT *
        FROM cashbook_receipts
        ORDER BY
            entryDate ASC NULLS LAST,
            id ASC
    `);

    // --------------------------------------------------------
    // BANK DEPOSITS
    // --------------------------------------------------------

    const bankDeposits = await query(`
        SELECT *
        FROM bank_deposits
        ORDER BY
            entryDate ASC NULLS LAST,
            id ASC
    `);

    // --------------------------------------------------------
    // HQ REMITTANCES
    // --------------------------------------------------------

    const hoRemittances = await query(`
        SELECT *
        FROM ho_remittances
        ORDER BY
            entryDate ASC NULLS LAST,
            id ASC
    `);

    // ========================================================
    // COMBINE ALL ENTRIES
    // ========================================================

    const rows = [

        // ----------------------------------------------------
        // MANUAL
        // ----------------------------------------------------

        ...manual.map((r) => ({
            id: `M${r.id}`,
            rawId: r.id,

            date: normalizeDate(r.entryDate),

            voucherNo:
                r.voucherNo ||
                `JV-${r.id}`,

            party: r.party || "",

            description:
                r.description || "",

            source: "Manual Entry",

            farm: r.farm || "",

            debit: money(r.debit),

            credit: money(r.credit),

            remarks:
                r.remarks || "",

            auto: false,
        })),

        // ----------------------------------------------------
        // FINANCE BILLS
        // ----------------------------------------------------

        ...bills.map((b) => ({
            id: `B${b.id}`,

            rawId: b.id,

            date: normalizeDate(b.billDate),

            voucherNo:
                b.sNo
                    ? `BILL-${b.sNo}`
                    : `BILL-${b.id}`,

            party:
                b.contractorName || "",

            description:
                b.item ||
                b.remarks ||
                `Bill — ${b.headName || ""}`,

            source: "Finance Bill",

            farm:
                b.farm || "",

            debit: 0,

            credit:
                money(b.amount),

            remarks:
                b.remarks || "",

            auto: true,
        })),

        // ----------------------------------------------------
        // CASH BOOK RECEIPTS
        // ----------------------------------------------------

        ...receipts.map((r) => ({
            id: `R${r.id}`,

            rawId: r.id,

            date:
                normalizeDate(r.entryDate),

            voucherNo:
                r.voucherNo ||
                `RV-${r.id}`,

            party:
                r.party || "",

            description:
                r.description ||
                r.head ||
                r.source ||
                "Receipt",

            source:
                "Cash Book Receipt",

            farm:
                r.farm || "",

            debit:
                money(r.cash) +
                money(r.bank),

            credit: 0,

            remarks: "",

            auto: true,
        })),

        // ----------------------------------------------------
        // BANK DEPOSITS
        // ----------------------------------------------------

        ...bankDeposits.map((r) => ({
            id: `BD${r.id}`,

            rawId: r.id,

            date:
                normalizeDate(r.entryDate),

            voucherNo:
                r.voucherNo ||
                `BD-${r.id}`,

            party:
                "Bank Deposit",

            description:
                r.remarks ||
                `Bank Deposit — ${
                    r.head || "Milk Sale"
                }`,

            source:
                "Bank Deposit",

            farm:
                r.farm || "",

            debit:
                money(r.amount),

            credit: 0,

            remarks:
                r.remarks || "",

            auto: true,
        })),

        // ----------------------------------------------------
        // HQ REMITTANCES
        // ----------------------------------------------------

        ...hoRemittances.map((r) => ({
            id: `HO${r.id}`,

            rawId: r.id,

            date:
                normalizeDate(r.entryDate),

            voucherNo:
                r.voucherNo ||
                `HOR-${r.id}`,

            party:
                "Head Office",

            description:
                r.remarks ||
                `HQ Remittance (${
                    r.transferMode || "RTGS"
                })`,

            source:
                "HQ Remittance",

            farm:
                r.farm || "",

            debit: 0,

            credit:
                money(r.amount),

            remarks:
                r.remarks || "",

            auto: true,
        })),
    ];

    // ========================================================
    // FILTER
    // ========================================================

    return rows
        .filter((r) => {
            if (!from) return true;
            return r.date >= String(from);
        })

        .filter((r) => {
            if (!to) return true;
            return r.date <= String(to);
        })

        .filter((r) => {
            if (!farm) return true;
            return r.farm === farm;
        })

        .filter((r) => {
            if (!party) return true;

            return (
                String(r.party || "")
                    .toLowerCase()
                    ===
                String(party)
                    .toLowerCase()
            );
        })

        .sort((a, b) => {
            const dateCompare =
                String(a.date)
                    .localeCompare(
                        String(b.date)
                    );

            if (dateCompare !== 0) {
                return dateCompare;
            }

            return String(a.id)
                .localeCompare(
                    String(b.id)
                );
        });
}

// ============================================================
// RUNNING BALANCE
// ============================================================

function withRunningBalance(rows) {
    let balance = 0;

    return rows.map((row) => {

        balance +=
            money(row.debit) -
            money(row.credit);

        return {
            ...row,
            balance,
        };
    });
}


// ============================================================
// BALANCE SHEET — HEAD-WISE REMAINING BALANCES
// ============================================================

router.get("/balance-sheet", async (req, res) => {
    try {
        const { farm, fromDate, toDate } = req.query;
        const params = [];
        let farmHeads = "";
        let farmBills = "";
        let farmAllocations = "";
        let dateBills = "";

        if (farm) {
            params.push(farm);
            farmHeads = `WHERE h.farm = $1`;
            farmBills = `AND b.farm = $1`;
            farmAllocations = `AND a.farm = $1`;
        }

        if (fromDate) {
            params.push(fromDate);
            dateBills += ` AND b."billDate" >= $${params.length}`;
        }
        if (toDate) {
            params.push(toDate);
            dateBills += ` AND b."billDate" <= $${params.length}`;
        }

        const result = await db.query(`
            SELECT
                h.id,
                h."headName",
                h.amount AS "baseAmount",
                COALESCE((
                    SELECT SUM(a.amount)
                    FROM finance_allocations a
                    WHERE a."headId" = h.id ${farmAllocations}
                ), 0) AS "additionalAllocation",
                COALESCE((
                    SELECT SUM(b.amount)
                    FROM finance_bills b
                    WHERE b."headId" = h.id ${farmBills} ${dateBills}
                ), 0) AS "billAmount",
                COALESCE((
                    SELECT SUM(b.amount)
                    FROM finance_bills b
                    WHERE b."headId" = h.id
                      AND LOWER(COALESCE(b.status, '')) = 'paid'
                      ${farmBills} ${dateBills}
                ), 0) AS "paidAmount",
                COALESCE((
                    SELECT SUM(b.amount)
                    FROM finance_bills b
                    WHERE b."headId" = h.id
                      AND LOWER(COALESCE(b.status, '')) <> 'paid'
                      ${farmBills} ${dateBills}
                ), 0) AS "payableAmount"
            FROM finance_heads h
            ${farmHeads}
            ORDER BY h."headName" ASC, h.id ASC
        `, params);

        const billsParams = farm ? [farm] : [];
        let billsWhere = `WHERE 1=1`;
        if (farm) billsWhere += ` AND b.farm = $1`;
        if (fromDate) { billsParams.push(fromDate); billsWhere += ` AND b."billDate" >= $${billsParams.length}`; }
        if (toDate) { billsParams.push(toDate); billsWhere += ` AND b."billDate" <= $${billsParams.length}`; }
        const billsResult = await db.query(`
            SELECT b.id, b."headId", b."billDate", b."sNo", b."contractorName", b.item, b.amount, b.status, b.remarks
            FROM finance_bills b
            ${billsWhere}
            ORDER BY b."headId" ASC, b."billDate" ASC NULLS LAST, b.id ASC
        `, billsParams);

        const billsByHead = new Map();
        for (const b of billsResult.rows) {
            const key = String(b.headId);
            if (!billsByHead.has(key)) billsByHead.set(key, []);
            billsByHead.get(key).push({
                id: b.id,
                billDate: b.billDate,
                billNo: b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`,
                contractorName: b.contractorName || "",
                item: b.item || "",
                amount: num(b.amount),
                status: b.status || "Payable",
                remarks: b.remarks || "",
            });
        }

        const rows = result.rows.map((r) => {
            const baseAmount = num(r.baseAmount);
            const additionalAllocation = num(r.additionalAllocation);
            const totalAmount = baseAmount + additionalAllocation;
            const billAmount = num(r.billAmount);
            const paidAmount = num(r.paidAmount);
            const payableAmount = num(r.payableAmount);
            const bills = billsByHead.get(String(r.id)) || [];
            return {
                ...r,
                baseAmount,
                additionalAllocation,
                totalAmount,
                billAmount,
                paidAmount,
                payableAmount,
                remaining: totalAmount - billAmount,
                bills,
            };
        });

        const totals = rows.reduce((a, r) => {
            a.totalAmount += r.totalAmount;
            a.billAmount += r.billAmount;
            a.paidAmount += r.paidAmount;
            a.payableAmount += r.payableAmount;
            a.remaining += r.remaining;
            return a;
        }, { totalAmount: 0, billAmount: 0, paidAmount: 0, payableAmount: 0, remaining: 0 });

        res.json({ farm: farm || "", fromDate: fromDate || "", toDate: toDate || "", rows, totals });
    } catch (err) {
        console.error("GET /ledger/balance-sheet:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// GENERAL LEDGER
// ============================================================

router.get("/general", async (req, res) => {
    try {

        const rows =
            await ledgerRows(req.query);

        res.json(
            withRunningBalance(rows)
        );

    } catch (err) {

        console.error(
            "GET /ledger/general:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});


// PARTY LEDGER — BILL / HEAD-WISE SUMMARY
router.get("/party-summary", async (req, res) => {
    try {
        const { farm, party, fromDate, toDate } = req.query;

        const params = [];
        const filters = [];
        if (party && String(party).trim()) {
            params.push(String(party).trim());
            filters.push(`LOWER(TRIM(COALESCE(b."contractorName", ''))) = LOWER(TRIM($${params.length}))`);
        }
        if (farm) {
            params.push(farm);
            filters.push(`b.farm = $${params.length}`);
        }
        if (fromDate) {
            params.push(fromDate);
            filters.push(`DATE(b."billDate") >= $${params.length}::date`);
        }
        if (toDate) {
            params.push(toDate);
            filters.push(`DATE(b."billDate") <= $${params.length}::date`);
        }
        const whereSql = filters.length ? `AND ${filters.join('\n              AND ')}` : '';

        const result = await db.query(`
            SELECT
                b.id,
                b."sNo",
                b."billDate",
                b."headId",
                COALESCE(h."headName", 'Unassigned Head') AS "headName",
                b.contractorName,
                b.item,
                b.amount,
                b.status,
                b."paymentMode",
                b.remarks
            FROM finance_bills b
            LEFT JOIN finance_heads h ON h.id = b."headId"
            WHERE 1=1
              ${whereSql}
            ORDER BY
                COALESCE(h."headName", 'Unassigned Head') ASC,
                COALESCE(b."billDate", '') ASC,
                COALESCE(b."sNo", 0) ASC,
                b.id ASC
        `, params);

        const groups = new Map();
        let totalBusiness = 0;
        let totalPaid = 0;
        let totalPayable = 0;

        result.rows.forEach((row) => {
            const amount = num(row.amount);
            const paid = String(row.status || "").trim().toLowerCase() === "paid" ? amount : 0;
            const payable = amount - paid;
            totalBusiness += amount;
            totalPaid += paid;
            totalPayable += payable;

            const partyName = String(row.contractorName || "Unassigned Party").trim() || "Unassigned Party";
            const partyKey = partyName.toLowerCase();
            const key = `${partyKey}::${String(row.headId || `name:${row.headName}`).toLowerCase()}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    partyName,
                    partyKey,
                    headId: row.headId,
                    headName: row.headName,
                    totalBill: 0,
                    paid: 0,
                    payable: 0,
                    remaining: 0,
                    bills: [],
                });
            }

            const g = groups.get(key);
            g.totalBill += amount;
            g.paid += paid;
            g.payable += payable;
            g.bills.push({
                id: row.id,
                sNo: row.sNo,
                billDate: normalizeDate(row.billDate),
                item: row.item || "",
                amount,
                status: row.status || "Not Paid",
                paid,
                payable,
                paymentMode: row.paymentMode || "",
                remarks: row.remarks || "",
            });
        });

        // Remaining in each head is based on the head's total available amount
        // (base head amount + allocations), less every bill under that head.
        const headIds = Array.from(groups.values())
            .map((g) => g.headId)
            .filter(Boolean);

        if (headIds.length) {
            const headResult = await db.query(`
                SELECT
                    h.id,
                    h."headName",
                    h.amount,
                    COALESCE((SELECT SUM(a.amount) FROM finance_allocations a WHERE a."headId" = h.id ${farm ? 'AND a.farm = $2' : ''}), 0) AS allocated
                FROM finance_heads h
                WHERE h.id = ANY($1::int[])
            `, farm ? [headIds, farm] : [headIds]);

            const headMap = new Map(headResult.rows.map((h) => [String(h.id), h]));
            groups.forEach((g) => {
                const h = headMap.get(String(g.headId));
                const headTotal = h ? num(h.amount) + num(h.allocated) : 0;
                g.headTotal = headTotal;
                // Party Ledger is separate from the General/Simple Ledger: only PAID bills
                // reduce the Party Ledger remaining head balance. Payable bills stay
                // visible in the payable column but do not reduce this Party balance.
                g.remaining = headTotal - g.paid;
                g.remainingAfterEachBill = [];
                let running = headTotal;
                g.bills.forEach((b) => {
                    if (b.paid > 0) running -= b.paid;
                    b.remaining = running;
                    g.remainingAfterEachBill.push(running);
                });
            });
        } else {
            groups.forEach((g) => {
                g.headTotal = 0;
                g.remaining = -g.totalBill;
                let running = 0;
                g.bills.forEach((b) => {
                    if (b.paid > 0) running -= b.paid;
                    b.remaining = running;
                });
            });
        }

        res.json({
            party: party ? String(party).trim() : "All Contractors",
            fromDate: fromDate || "",
            toDate: toDate || "",
            summary: Array.from(groups.values()),
            totals: {
                business: totalBusiness,
                paid: totalPaid,
                payable: totalPayable,
            },
        });
    } catch (err) {
        console.error("GET /ledger/party-summary:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// PARTY LEDGER
// ============================================================

router.get("/party", async (req, res) => {
    try {

        if (!req.query.party) {
            return res.json([]);
        }

        const rows =
            await ledgerRows(req.query);

        res.json(
            withRunningBalance(rows)
        );

    } catch (err) {

        console.error(
            "GET /ledger/party:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// PARTY LIST
// ============================================================

router.get("/parties", async (req, res) => {
    try {

        const { farm } =
            req.query;

        let sql = `
            SELECT *
            FROM ledger_parties
            WHERE 1=1
        `;

        const params = [];

        if (farm) {
            params.push(farm);

            sql += `
                AND farm = $${params.length}
            `;
        }

        sql += `
            ORDER BY name ASC
        `;

        const manual =
            await query(sql, params);

        const rows =
            await ledgerRows({ farm });

        const seen =
            new Map();

        // ----------------------------------------------------
        // MANUAL PARTIES
        // ----------------------------------------------------

        manual.forEach((p) => {

            const name =
                String(p.name || "")
                    .trim();

            if (!name) return;

            seen.set(
                name.toLowerCase(),
                {
                    name,

                    manual: true,

                    id: p.id,

                    type:
                        p.type || "Other",

                    contact:
                        p.contact || "",

                    openingBalance:
                        money(
                            p.openingBalance
                        ),

                    remarks:
                        p.remarks || "",
                }
            );
        });

        // ----------------------------------------------------
        // PARTIES FOUND IN AUTO ENTRIES
        // ----------------------------------------------------

        rows.forEach((r) => {

            const name =
                String(r.party || "")
                    .trim();

            if (
                !name ||
                [
                    "Bank Deposit",
                    "Head Office",
                ].includes(name)
            ) {
                return;
            }

            const key =
                name.toLowerCase();

            if (!seen.has(key)) {

                seen.set(key, {
                    name,
                    manual: false,
                });
            }
        });

        res.json(
            Array.from(
                seen.values()
            ).sort((a, b) =>
                a.name.localeCompare(
                    b.name
                )
            )
        );

    } catch (err) {

        console.error(
            "GET /ledger/parties:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// ADD PARTY
// ============================================================

router.post("/parties", async (req, res) => {
    try {

        const {
            farm,
            name,
            type,
            contact,
            openingBalance,
            remarks,
        } = req.body;

        if (
            !name ||
            !String(name).trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Party name is required",
            });
        }

        const result =
            await db.query(
                `INSERT INTO ledger_parties
                (
                    farm,
                    name,
                    type,
                    contact,
                    openingBalance,
                    remarks
                )
                VALUES
                ($1,$2,$3,$4,$5,$6)
                RETURNING id`,
                [
                    farm || null,

                    String(name).trim(),

                    type || "Other",

                    contact || "",

                    money(openingBalance),

                    remarks || "",
                ]
            );

        res.json({
            success: true,

            message:
                "Party added successfully",

            id:
                result.rows[0].id,
        });

    } catch (err) {

        console.error(
            "POST /ledger/parties:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// UPDATE PARTY
// ============================================================

router.put("/parties/:id", async (req, res) => {
    try {

        const {
            name,
            type,
            contact,
            openingBalance,
            remarks,
        } = req.body;

        if (
            !name ||
            !String(name).trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Party name is required",
            });
        }

        const result =
            await db.query(
                `UPDATE ledger_parties
                 SET
                    name = $1,
                    type = $2,
                    contact = $3,
                    openingBalance = $4,
                    remarks = $5,
                    "updatedAt" =
                        CURRENT_TIMESTAMP
                 WHERE id = $6`,
                [
                    String(name).trim(),

                    type || "Other",

                    contact || "",

                    money(openingBalance),

                    remarks || "",

                    req.params.id,
                ]
            );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Party not found",
            });
        }

        res.json({
            success: true,
            message:
                "Party updated successfully",
        });

    } catch (err) {

        console.error(
            "PUT /ledger/parties:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// DELETE PARTY
// ============================================================

router.delete("/parties/:id", async (req, res) => {
    try {

        const result =
            await db.query(
                `DELETE FROM ledger_parties
                 WHERE id = $1`,
                [req.params.id]
            );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Party not found",
            });
        }

        res.json({
            success: true,
            message:
                "Party deleted successfully",
        });

    } catch (err) {

        console.error(
            "DELETE /ledger/parties:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// MANUAL LEDGER ENTRIES
// ============================================================

// GET ENTRIES
router.get("/entries", async (req, res) => {
    try {

        const { farm } =
            req.query;

        let sql = `
            SELECT *
            FROM ledger_entries
            WHERE 1=1
        `;

        const params = [];

        if (farm) {

            params.push(farm);

            sql += `
                AND farm = $${params.length}
            `;
        }

        sql += `
            ORDER BY
                entryDate DESC NULLS LAST,
                id DESC
        `;

        const rows =
            await query(sql, params);

        res.json(rows);

    } catch (err) {

        console.error(
            "GET /ledger/entries:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ADD ENTRY
router.post("/entries", async (req, res) => {
    try {

        const {
            farm,
            entryDate,
            voucherNo,
            party,
            description,
            debit,
            credit,
            remarks,
        } = req.body;

        const debitAmount =
            money(debit);

        const creditAmount =
            money(credit);

        if (
            debitAmount <= 0 &&
            creditAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter a Debit or Credit amount",
            });
        }

        if (
            debitAmount > 0 &&
            creditAmount > 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter either Debit or Credit, not both",
            });
        }

        const result =
            await db.query(
                `INSERT INTO ledger_entries
                (
                    farm,
                    entryDate,
                    voucherNo,
                    party,
                    description,
                    debit,
                    credit,
                    remarks
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8)
                RETURNING id`,
                [
                    farm || null,

                    entryDate || "",

                    voucherNo || "",

                    party || "",

                    description || "",

                    debitAmount,

                    creditAmount,

                    remarks || "",
                ]
            );

        res.json({
            success: true,

            message:
                "Ledger entry added successfully",

            id:
                result.rows[0].id,
        });

    } catch (err) {

        console.error(
            "POST /ledger/entries:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// UPDATE ENTRY
router.put("/entries/:id", async (req, res) => {
    try {

        const {
            entryDate,
            voucherNo,
            party,
            description,
            debit,
            credit,
            remarks,
        } = req.body;

        const debitAmount =
            money(debit);

        const creditAmount =
            money(credit);

        if (
            debitAmount <= 0 &&
            creditAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter a Debit or Credit amount",
            });
        }

        if (
            debitAmount > 0 &&
            creditAmount > 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter either Debit or Credit, not both",
            });
        }

        const result =
            await db.query(
                `UPDATE ledger_entries
                 SET
                    entryDate = $1,
                    voucherNo = $2,
                    party = $3,
                    description = $4,
                    debit = $5,
                    credit = $6,
                    remarks = $7,
                    "updatedAt" =
                        CURRENT_TIMESTAMP
                 WHERE id = $8`,
                [
                    entryDate || "",

                    voucherNo || "",

                    party || "",

                    description || "",

                    debitAmount,

                    creditAmount,

                    remarks || "",

                    req.params.id,
                ]
            );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Entry not found",
            });
        }

        res.json({
            success: true,
            message:
                "Ledger entry updated successfully",
        });

    } catch (err) {

        console.error(
            "PUT /ledger/entries:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// DELETE ENTRY
router.delete("/entries/:id", async (req, res) => {
    try {

        const result =
            await db.query(
                `DELETE FROM ledger_entries
                 WHERE id = $1`,
                [req.params.id]
            );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Entry not found",
            });
        }

        res.json({
            success: true,
            message:
                "Ledger entry deleted successfully",
        });

    } catch (err) {

        console.error(
            "DELETE /ledger/entries:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
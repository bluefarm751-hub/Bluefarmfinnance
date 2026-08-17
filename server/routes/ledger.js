const express = require("express");
const router = express.Router();
const db = require("../database/database");

/**
 * LEDGER (General + Party)
 *
 * Combines two kinds of entries into one Debit/Credit register:
 *   1. AUTO entries — pulled read-only from records already entered elsewhere
 *      in the software (Finance Bills, Cash Book Receipts, Bank Deposits,
 *      HQ Remittances). Debit = money received, Credit = money paid — same
 *      convention already used by the Cash Book Statement.
 *   2. MANUAL entries — journal-style entries added directly on the Ledger
 *      pages (opening balances, adjustments, or anything not already
 *      captured elsewhere), stored in ledger_entries.
 *
 * General Ledger = every entry, running balance.
 * Party Ledger   = same entries filtered to one party, running balance
 *                   for that party only.
 */

const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  );
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve(this);
    })
  );

// ---------- Build the combined AUTO + MANUAL row list ----------
async function ledgerRows(filters = {}) {
  const { farm, from, to, party } = filters;

  const manual = await all("SELECT * FROM ledger_entries ORDER BY date(entryDate) ASC, id ASC");
  const bills = await all(`
    SELECT b.*, h.headName AS headName
    FROM finance_bills b
    LEFT JOIN finance_heads h ON h.id = b.headId
    ORDER BY date(b.billDate) ASC, b.id ASC`);
  const receipts = await all("SELECT * FROM cashbook_receipts ORDER BY date(entryDate) ASC, id ASC");
  const bankDeposits = await all("SELECT * FROM bank_deposits ORDER BY date(entryDate) ASC, id ASC");
  const hoRemittances = await all("SELECT * FROM ho_remittances ORDER BY date(entryDate) ASC, id ASC");

  const rows = [
    ...manual.map((r) => ({
      id: `M${r.id}`,
      rawId: r.id,
      date: r.entryDate || "",
      voucherNo: r.voucherNo || `JV-${r.id}`,
      party: r.party || "",
      description: r.description || "",
      source: "Manual Entry",
      farm: r.farm || "",
      debit: num(r.debit),
      credit: num(r.credit),
      remarks: r.remarks || "",
      auto: false,
    })),
    ...bills.map((b) => ({
      id: `B${b.id}`,
      date: b.billDate || "",
      voucherNo: b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`,
      party: b.contractorName || "",
      description: b.item || b.remarks || `Bill — ${b.headName || ""}`,
      source: "Finance Bill",
      farm: b.farm || "",
      debit: 0,
      credit: num(b.amount),
      remarks: b.remarks || "",
      auto: true,
    })),
    ...receipts.map((r) => ({
      id: `R${r.id}`,
      date: r.entryDate || "",
      voucherNo: r.voucherNo || `RV-${r.id}`,
      party: r.party || "",
      description: r.description || r.head || r.source || "Receipt",
      source: "Cash Book Receipt",
      farm: r.farm || "",
      debit: num(r.cash) + num(r.bank),
      credit: 0,
      remarks: "",
      auto: true,
    })),
    ...bankDeposits.map((r) => ({
      id: `BD${r.id}`,
      date: r.entryDate || "",
      voucherNo: r.voucherNo || `BD-${r.id}`,
      party: "Bank Deposit",
      description: r.remarks || `Bank Deposit — ${r.head || "Milk Sale"}`,
      source: "Bank Deposit",
      farm: r.farm || "",
      debit: num(r.amount),
      credit: 0,
      remarks: r.remarks || "",
      auto: true,
    })),
    ...hoRemittances.map((r) => ({
      id: `HO${r.id}`,
      date: r.entryDate || "",
      voucherNo: r.voucherNo || `HOR-${r.id}`,
      party: "Head Office",
      description: r.remarks || `HQ Remittance (${r.transferMode || "RTGS"})`,
      source: "HQ Remittance",
      farm: r.farm || "",
      debit: 0,
      credit: num(r.amount),
      remarks: r.remarks || "",
      auto: true,
    })),
  ];

  return rows
    .filter((r) => (from ? (r.date || "") >= from : true))
    .filter((r) => (to ? (r.date || "") <= to : true))
    .filter((r) => (farm ? r.farm === farm : true))
    .filter((r) => (party ? (r.party || "").toLowerCase() === String(party).toLowerCase() : true))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
}

function withRunningBalance(rows) {
  let balance = 0;
  return rows.map((r) => {
    balance += num(r.debit) - num(r.credit);
    return { ...r, balance };
  });
}

// ---------- GENERAL LEDGER ----------
router.get("/general", async (req, res) => {
  try {
    const rows = await ledgerRows(req.query);
    res.json(withRunningBalance(rows));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- PARTY LEDGER ----------
router.get("/party", async (req, res) => {
  try {
    if (!req.query.party) return res.json([]);
    const rows = await ledgerRows(req.query);
    res.json(withRunningBalance(rows));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- PARTY LIST (manual master + names seen in bills/receipts) ----------
router.get("/parties", async (req, res) => {
  try {
    const { farm } = req.query;

    let sql = "SELECT * FROM ledger_parties WHERE 1=1";
    const params = [];
    if (farm) {
      sql += " AND farm=?";
      params.push(farm);
    }
    sql += " ORDER BY name ASC";
    const manual = await all(sql, params);

    const rows = await ledgerRows({ farm });
    const seen = new Map();
    manual.forEach((p) => seen.set(p.name.toLowerCase(), { name: p.name, manual: true, id: p.id, type: p.type, contact: p.contact, openingBalance: p.openingBalance, remarks: p.remarks }));
    rows.forEach((r) => {
      const name = (r.party || "").trim();
      if (!name || ["Bank Deposit", "Head Office"].includes(name)) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, { name, manual: false });
    });

    res.json(Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/parties", async (req, res) => {
  try {
    const { farm, name, type, contact, openingBalance, remarks } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Party name is required" });
    }
    const r = await run(
      `INSERT INTO ledger_parties (farm, name, type, contact, openingBalance, remarks)
       VALUES (?,?,?,?,?,?)`,
      [farm || null, name.trim(), type || "Other", contact || "", num(openingBalance), remarks || ""]
    );
    res.json({ success: true, message: "Party added successfully", id: r.lastID });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/parties/:id", async (req, res) => {
  try {
    const { name, type, contact, openingBalance, remarks } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Party name is required" });
    }
    const r = await run(
      `UPDATE ledger_parties SET name=?, type=?, contact=?, openingBalance=?, remarks=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
      [name.trim(), type || "Other", contact || "", num(openingBalance), remarks || "", req.params.id]
    );
    if (r.changes === 0) return res.status(404).json({ success: false, message: "Party not found" });
    res.json({ success: true, message: "Party updated successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/parties/:id", async (req, res) => {
  try {
    const r = await run("DELETE FROM ledger_parties WHERE id=?", [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: "Party not found" });
    res.json({ success: true, message: "Party deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- MANUAL LEDGER ENTRIES (journal) ----------
router.get("/entries", async (req, res) => {
  try {
    const { farm } = req.query;
    let sql = "SELECT * FROM ledger_entries WHERE 1=1";
    const params = [];
    if (farm) {
      sql += " AND farm=?";
      params.push(farm);
    }
    sql += " ORDER BY date(entryDate) DESC, id DESC";
    res.json(await all(sql, params));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/entries", async (req, res) => {
  try {
    const { farm, entryDate, voucherNo, party, description, debit, credit, remarks } = req.body;
    if (!num(debit) && !num(credit)) {
      return res.status(400).json({ success: false, message: "Enter a Debit or Credit amount" });
    }
    const r = await run(
      `INSERT INTO ledger_entries (farm, entryDate, voucherNo, party, description, debit, credit, remarks)
       VALUES (?,?,?,?,?,?,?,?)`,
      [farm || null, entryDate || "", voucherNo || "", party || "", description || "", num(debit), num(credit), remarks || ""]
    );
    res.json({ success: true, message: "Ledger entry added successfully", id: r.lastID });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/entries/:id", async (req, res) => {
  try {
    const { entryDate, voucherNo, party, description, debit, credit, remarks } = req.body;
    const r = await run(
      `UPDATE ledger_entries
       SET entryDate=?, voucherNo=?, party=?, description=?, debit=?, credit=?, remarks=?, updatedAt=CURRENT_TIMESTAMP
       WHERE id=?`,
      [entryDate || "", voucherNo || "", party || "", description || "", num(debit), num(credit), remarks || "", req.params.id]
    );
    if (r.changes === 0) return res.status(404).json({ success: false, message: "Entry not found" });
    res.json({ success: true, message: "Ledger entry updated successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/entries/:id", async (req, res) => {
  try {
    const r = await run("DELETE FROM ledger_entries WHERE id=?", [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: "Entry not found" });
    res.json({ success: true, message: "Ledger entry deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

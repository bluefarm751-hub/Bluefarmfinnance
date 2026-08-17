const express = require("express");
const router = express.Router();
const db = require("../database/database");
const { buildSourceTag } = require("../utils/sourceTag");

/**
 * CASH BOOK
 * Blue Farm and Blue Remounts share ONE bank account, therefore every cash book
 * query covers BOTH farms. Nothing here is entered twice:
 *   Allocation Entries                  -> Receipt Side  (Bank)
 *   Bills (finance_bills)              -> Payment Side  (Cash / Bank)
 *   Add Income (cashbook_receipts)     -> Receipt Side  (Cash / Bank)
 *   Cash Withdrawal from Bank          -> Contra (C#): Receipt Cash + Payment Bank
 *   Cash Deposited into Bank           -> Contra (C#): Receipt Bank + Payment Cash
 *   Temporary Receipt                  -> only affects Daily Closing
 *
 * IMPORTANT: Allocations are ALWAYS bank entries (never cash).
 * Cash in Hand only increases when cash is Withdrawn from Bank.
 *
 * CONTRA ENTRIES (Cash <-> Bank transfers)
 * Withdrawing cash from the bank, or depositing cash into the bank, is never
 * income or expense — it is only a transfer between the two cash book
 * accounts. Both are recorded as a matching Receipt-side + Payment-side pair
 * under head "C#" (see contraLegs() below), exactly like a manual double
 * entry contra voucher:
 *   Cash Withdrawn from Bank -> Receipt: Cash  | Payment: Bank   (head C#)
 *   Cash Deposited into Bank -> Receipt: Bank  | Payment: Cash   (head C#)
 * Every automatic entry (Bill / Income / Allocation / Contra) also carries a
 * fixed "BLUE FARM — TYPE" / "BLUE REMOUNTS — TYPE" source tag that is
 * persisted in the database at creation time (see sourceTag columns).
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

const round2 = (v) => Math.round(num(v) * 100) / 100;
const moneyFmt = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;

const SAFE_LIMIT = 500000;

const isBank = (mode) => {
  const m = String(mode || "").toLowerCase();
  return m.includes("bank") || m.includes("cheque") || m.includes("transfer") || m.includes("online");
};

// ---------- CONTRA ENTRIES (Cash Withdrawal / Bank Deposit) ----------
// Cash withdrawn from the bank, or cash deposited into the bank, is never
// income/expense — it is a transfer between the Cash and Bank accounts of
// the same cash book, so it is always posted as a matching Receipt-side +
// Payment-side pair under head "C#" (a "Contra" entry).
async function contraLegs() {
  const withdrawals = await all("SELECT * FROM cash_withdrawals ORDER BY date(entryDate) ASC, id ASC");
  const deposits = await all("SELECT * FROM bank_deposits ORDER BY date(entryDate) ASC, id ASC");

  const receiptLegs = [];
  const paymentLegs = [];

  // Cash Withdrawn from Bank -> Receipt: Cash | Payment: Bank
  withdrawals.forEach((w) => {
    const tag = w.sourceTag || buildSourceTag(w.farm, "CONTRA");
    const base = {
      voucherNo: w.voucherNo || `CW-${w.id}`,
      party: "Contra Entry",
      description: w.remarks ? `Cash Withdrawn from Bank — ${w.remarks}` : "Cash Withdrawn from Bank",
      date: w.entryDate || "",
      head: "C#",
      source: tag,
      sourceTag: tag,
      farm: w.farm || "",
      auto: true,
    };
    receiptLegs.push({ id: `CW-R-${w.id}`, ...base, cash: num(w.amount), bank: 0 });
    paymentLegs.push({ id: `CW-P-${w.id}`, ...base, cash: 0, bank: num(w.amount) });
  });

  // Cash Deposited into Bank -> Receipt: Bank | Payment: Cash
  deposits.forEach((d) => {
    const tag = d.sourceTag || buildSourceTag(d.farm, "CONTRA");
    const base = {
      voucherNo: d.voucherNo || `BD-${d.id}`,
      party: "Contra Entry",
      description: d.remarks ? `Cash Deposited into Bank — ${d.remarks}` : "Cash Deposited into Bank",
      date: d.entryDate || "",
      head: "C#",
      source: tag,
      sourceTag: tag,
      farm: d.farm || "",
      auto: true,
    };
    receiptLegs.push({ id: `BD-R-${d.id}`, ...base, cash: 0, bank: num(d.amount) });
    paymentLegs.push({ id: `BD-P-${d.id}`, ...base, cash: num(d.amount), bank: 0 });
  });

  return { receiptLegs, paymentLegs };
}

// ---------- RECEIPT SIDE ----------
// Allocations (Bank) + manual Income entries (Cash/Bank) + the Receipt-side
// leg of every Contra entry (cash leg of a withdrawal, bank leg of a
// deposit). Finance heads themselves are NOT included separately — their
// total is already the sum of all their allocation entries.
async function receiptRows(filters = {}) {
  const manual = await all("SELECT * FROM cashbook_receipts ORDER BY date(entryDate) ASC, id ASC");

  // Get ALL allocation entries (each save = one entry)
  const allocations = await all(`
    SELECT a.*, h.headName AS headName, h.farm AS farm
    FROM finance_allocations a
    LEFT JOIN finance_heads h ON h.id = a.headId
    ORDER BY date(a.allocationDate) ASC, a.id ASC`);

  // Merge allocations by same date+head into one entry
  const allocByKey = {};
  allocations.forEach((a) => {
    const dt = a.allocationDate || "";
    const key = `alloc-${dt}-${a.headId || ""}`;
    if (!allocByKey[key]) {
      allocByKey[key] = { date: dt, headName: a.headName || "", farm: a.farm || "", amount: 0, refs: [] };
    }
    allocByKey[key].amount += num(a.amount);
    if (a.letterReference) allocByKey[key].refs.push(a.letterReference);
  });

  const { receiptLegs } = await contraLegs();

  const rows = [
    // Allocation entries → ALWAYS Bank (never cash)
    ...Object.values(allocByKey).map((a, i) => ({
      id: `A-${a.date}-${i}`,
      date: a.date,
      voucherNo: a.refs.filter(Boolean).join(", ") || `ALLOC-${a.date}`,
      party: "Budget Allocation",
      description: `Allocation for ${a.headName}`,
      head: a.headName,
      source: "Budget Allocation",
      sourceTag: buildSourceTag(a.farm, "ALLOCATION"),
      farm: a.farm || "",
      cash: 0,
      bank: a.amount,
      auto: true,
    })),
    // Manual receipts (Milk Sale, Culling, Other) — i.e. Add Income
    ...manual.map((r) => ({
      id: `R${r.id}`,
      rawId: r.id,
      date: r.entryDate || "",
      voucherNo: r.voucherNo || `RV-${r.id}`,
      party: r.party || "",
      description: r.description || "",
      head: r.head || r.source || "",
      source: r.source || "Other",
      sourceTag: r.sourceTag || buildSourceTag(r.farm, "INCOME"),
      farm: r.farm || "",
      cash: num(r.cash),
      bank: num(r.bank),
      auto: false,
    })),
    // Contra (Cash Withdrawal / Bank Deposit) — Receipt-side leg
    ...receiptLegs,
  ];

  return applyFilters(rows, filters);
}

// ---------- PAYMENT SIDE ----------
// Bills (Cash/Bank) + the Payment-side leg of every Contra entry + HO
// Remittance (always Bank-only — money sent out to Head Office). Putting HO
// Remittance here too means "Payment Side Bank Total" already includes it,
// so Cash in Bank is simply: Receipt Side Bank Total - Payment Side Bank
// Total, with no separate term to remember.
async function paymentRows(filters = {}) {
  const bills = await all(`
    SELECT b.*, h.headName AS headName
    FROM finance_bills b
    LEFT JOIN finance_heads h ON h.id = b.headId
    ORDER BY date(b.billDate) ASC, b.id ASC`);

  const rows = bills.map((b) => {
    const isCash = !isBank(b.paymentMode);
    return {
      id: `B${b.id}`,
      date: b.billDate || "",
      voucherNo: b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`,
      party: b.contractorName || "",
      description: b.item || b.remarks || "",
      head: b.headName || "",
      source: isBank(b.paymentMode) ? "Bank Transfer Bill" : "Cash Bill",
      sourceTag: b.sourceTag || buildSourceTag(b.farm, "BILL"),
      farm: b.farm || "",
      cash: isCash ? num(b.amount) : 0,
      bank: isBank(b.paymentMode) ? num(b.amount) : 0,
      auto: true,
    };
  });

  const hoRemittances = await all("SELECT * FROM ho_remittances ORDER BY date(entryDate) ASC, id ASC");
  const hoRows = hoRemittances.map((r) => ({
    id: `HO${r.id}`,
    date: r.entryDate || "",
    voucherNo: r.voucherNo || `HOR-${r.id}`,
    party: "Head Office",
    description: r.remarks || `HO Remittance (${r.transferMode || "RTGS"})`,
    head: "HO Remittance",
    source: "HO Remittance",
    sourceTag: buildSourceTag(r.farm, "HO REMITTANCE"),
    farm: r.farm || "",
    cash: 0,
    bank: num(r.amount),
    auto: true,
  }));

  const { paymentLegs } = await contraLegs();

  return applyFilters([...rows, ...hoRows, ...paymentLegs], filters);
}

function applyFilters(rows, { from, to, farm, head } = {}) {
  return rows
    .filter((r) => (from ? (r.date || "") >= from : true))
    .filter((r) => (to ? (r.date || "") <= to : true))
    .filter((r) => (farm ? r.farm === farm : true))
    .filter((r) => (head ? r.head === head : true))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

router.get("/receipts", async (req, res) => {
  try {
    res.json(await receiptRows(req.query));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/receipts", async (req, res) => {
  try {
    const { farm, entryDate, voucherNo, party, description, head, source, cash, bank } = req.body;
    // Fixed source indicator — always derived from the farm this software
    // instance is running as (Blue Farm / Blue Remounts), never picked manually.
    const sourceTag = buildSourceTag(farm, "INCOME");
    const r = await run(
      `INSERT INTO cashbook_receipts (farm, entryDate, voucherNo, party, description, head, source, sourceTag, cash, bank)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [farm || null, entryDate || "", voucherNo || "", party || "", description || "", head || "", source || "Other", sourceTag, num(cash), num(bank)]
    );
    res.json({ success: true, message: "Receipt added successfully", id: r.lastID, sourceTag });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/receipts/:id", async (req, res) => {
  try {
    await run("DELETE FROM cashbook_receipts WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Receipt deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/payments", async (req, res) => {
  try {
    res.json(await paymentRows(req.query));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- CASH WITHDRAWALS ----------
router.get("/withdrawals", async (req, res) => {
  try {
    const { from, to, farm } = req.query;
    let rows = await all("SELECT * FROM cash_withdrawals ORDER BY date(entryDate) ASC, id ASC");
    rows = rows
      .filter((r) => (from ? (r.entryDate || "") >= from : true))
      .filter((r) => (to ? (r.entryDate || "") <= to : true))
      .filter((r) => (farm ? r.farm === farm : true));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/withdrawals", async (req, res) => {
  try {
    const { farm, entryDate, voucherNo, chequeNo, amount, withdrawnBy, remarks } = req.body;
    const amt = num(amount);
    if (amt <= 0) return res.status(400).json({ success: false, message: "Amount is required" });

    const bal = await balances();
    if (amt > bal.cashInBank) {
      return res.status(400).json({ success: false, message: "Withdrawal exceeds available bank balance" });
    }
    if (bal.cashInHand + amt > SAFE_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Office safe limit is Rs. ${SAFE_LIMIT.toLocaleString()}. Cash in hand would become Rs. ${(bal.cashInHand + amt).toLocaleString()}.`,
      });
    }

    // Fixed source indicator — this is a Contra (C#) entry, always tagged
    // with the farm this software instance is running as.
    const sourceTag = buildSourceTag(farm, "CONTRA");
    const r = await run(
      `INSERT INTO cash_withdrawals (farm, entryDate, voucherNo, chequeNo, amount, withdrawnBy, remarks, sourceTag)
       VALUES (?,?,?,?,?,?,?,?)`,
      [farm || null, entryDate || "", voucherNo || "", chequeNo || "", amt, withdrawnBy || "", remarks || "", sourceTag]
    );
    res.json({ success: true, message: "Cash withdrawal recorded successfully", id: r.lastID, sourceTag });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/withdrawals/:id", async (req, res) => {
  try {
    await run("DELETE FROM cash_withdrawals WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Withdrawal deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- TEMPORARY RECEIPTS ----------
router.get("/trs", async (req, res) => {
  try {
    const { from, to, farm, status } = req.query;
    let rows = await all("SELECT * FROM temporary_receipts ORDER BY date(entryDate) ASC, id ASC");
    rows = rows
      .filter((r) => (from ? (r.entryDate || "") >= from : true))
      .filter((r) => (to ? (r.entryDate || "") <= to : true))
      .filter((r) => (farm ? r.farm === farm : true))
      .filter((r) => (status ? r.status === status : true));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/trs", async (req, res) => {
  try {
    const { farm, entryDate, description, issuedTo, amount, authority, status } = req.body;

    // Check if any cash has been withdrawn from bank
    const withdrawals = await all("SELECT SUM(amount) as total FROM cash_withdrawals");
    const totalWithdrawn = num(withdrawals[0]?.total || 0);
    if (totalWithdrawn <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please withdraw cash from the bank first.",
      });
    }

    const row = await all("SELECT IFNULL(MAX(sNo),0)+1 AS nextNo FROM temporary_receipts");
    const sNo = row[0]?.nextNo || 1;
    const r = await run(
      `INSERT INTO temporary_receipts (farm, sNo, entryDate, description, issuedTo, amount, authority, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [farm || null, sNo, entryDate || "", description || "", issuedTo || "", num(amount), authority || "", status || "Not Cleared"]
    );
    res.json({ success: true, message: "Temporary receipt issued successfully", id: r.lastID, sNo });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/trs/:id", async (req, res) => {
  try {
    const { description, issuedTo, amount, authority, status, entryDate } = req.body;
    await run(
      `UPDATE temporary_receipts
       SET entryDate=?, description=?, issuedTo=?, amount=?, authority=?, status=?,
           clearedDate = CASE WHEN ?='Cleared' THEN date('now') ELSE NULL END
       WHERE id=?`,
      [entryDate || "", description || "", issuedTo || "", num(amount), authority || "", status || "Not Cleared", status || "", req.params.id]
    );
    res.json({ success: true, message: "Temporary receipt updated successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/trs/:id", async (req, res) => {
  try {
    await run("DELETE FROM temporary_receipts WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Temporary receipt deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- BALANCES / SUMMARY ----------
async function balances(upto) {
  const cut = (d) => (upto ? (d || "") <= upto : true);

  // receiptRows()/paymentRows() already include the Contra (C#) legs for
  // every Cash Withdrawal and Bank Deposit (see contraLegs() above), so
  // they are netted out correctly below without any separate adjustment.
  const receipts = (await receiptRows()).filter((r) => cut(r.date));
  const payments = (await paymentRows()).filter((r) => cut(r.date));
  const withdrawals = (await all("SELECT * FROM cash_withdrawals")).filter((r) => cut(r.entryDate));
  const bankDeposits = (await all("SELECT * FROM bank_deposits")).filter((r) => cut(r.entryDate));
  const hoRemittances = (await all("SELECT * FROM ho_remittances")).filter((r) => cut(r.entryDate));
  const trs = (await all("SELECT * FROM temporary_receipts")).filter((r) => cut(r.entryDate));

  const sum = (arr, k) => arr.reduce((t, r) => t + num(r[k]), 0);

  const receiptBank = sum(receipts, "bank");
  const receiptCash = sum(receipts, "cash");
  const paymentBank = sum(payments, "bank");
  const paymentCash = sum(payments, "cash");
  // Kept for display/reference only (e.g. Daily Closing, HO Remittance tab)
  // — NOT used in the balance formulas below. Cash Withdrawal / Bank Deposit
  // (Contra legs) and HO Remittance are already inside receiptBank/
  // paymentBank/receiptCash/paymentCash via receiptRows()/paymentRows().
  const totalWithdrawn = sum(withdrawals, "amount");
  const totalBankDeposited = sum(bankDeposits, "amount");
  const trOutstanding = sum(trs.filter((t) => t.status !== "Cleared"), "amount");
  const trIssued = sum(trs, "amount");
  const totalHoRemitted = sum(hoRemittances, "amount");

  // Cash in Bank = Receipt Side Bank Column Total - Payment Side Bank Column Total
  // (Allocations + Bank Income + Contra Deposits) - (Bank Bills + HO Remittance + Contra Withdrawals)
  const cashInBank = receiptBank - paymentBank;
  // Cash in Hand = Receipt Side Cash Column Total - Payment Side Cash Column Total - Outstanding TR
  // (Cash Income + Contra Withdrawals) - (Cash Bills + Contra Deposits) - Uncleared TRs
  const cashInHand = receiptCash - paymentCash - trOutstanding;

  return {
    cashInBank,
    cashInHand,
    trOutstanding,
    trIssued,
    totalHoRemitted,
    totalBankDeposited,
    totalBalance: cashInBank + cashInHand + trOutstanding,
    receiptBank,
    receiptCash,
    paymentBank,
    paymentCash,
    totalWithdrawn,
    safeLimit: SAFE_LIMIT,
  };
}

router.get("/summary", async (req, res) => {
  try {
    res.json(await balances(req.query.upto));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- DAILY CLOSING ----------
// Expected Cash = Receipt Side Cash total - Payment Side Cash total - Outstanding TR.
// (Cash Withdrawal / Bank Deposit are NOT added/subtracted separately here —
// they are Contra entries and are already inside Receipt Side Cash / Payment
// Side Cash via their C# legs, so adding them again would double-count.)
router.get("/closing-summary", async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const b = await balances(date);
    const expectedCash = round2(b.receiptCash - b.paymentCash - b.trOutstanding);
    res.json({
      date,
      totalWithdrawn: b.totalWithdrawn,
      cashReceipts: b.receiptCash,
      cashBills: b.paymentCash,
      trIssued: b.trOutstanding,
      expectedCash,
      safeLimit: SAFE_LIMIT,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/closings", async (req, res) => {
  try {
    const { from, to } = req.query;
    let rows = await all("SELECT * FROM daily_closings ORDER BY date(closingDate) DESC, id DESC");
    rows = rows
      .filter((r) => (from ? (r.closingDate || "") >= from : true))
      .filter((r) => (to ? (r.closingDate || "") <= to : true));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/closings", async (req, res) => {
  try {
    const { farm, closingDate, actualCash, denominations, remarks } = req.body;
    const date = closingDate || new Date().toISOString().slice(0, 10);
    const b = await balances(date);
    // Expected/Actual Cash = Receipt Side Cash - Payment Side Cash - Outstanding TR
    // (Contra legs of Withdrawal/Deposit are already inside receiptCash/paymentCash.)
    const expectedCash = round2(b.receiptCash - b.paymentCash - b.trOutstanding);
    const actual = round2(actualCash);
    // Cash Counted - Expected Cash = Difference (0 = Same/Balanced, +ve = Surplus/Excess, -ve = Shortage)
    const difference = round2(actual - expectedCash);
    const status = difference === 0 ? "Balanced" : difference > 0 ? "Excess" : "Shortage";

    await run("DELETE FROM daily_closings WHERE closingDate=?", [date]);
    const r = await run(
      `INSERT INTO daily_closings
        (farm, closingDate, totalWithdrawn, cashBills, trIssued, expectedCash, actualCash, difference, status, denominations, remarks)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        farm || null, date, b.totalWithdrawn, b.paymentCash, b.trOutstanding,
        expectedCash, actual, difference, status,
        JSON.stringify(denominations || {}), remarks || "",
      ]
    );
    res.json({ success: true, message: `Daily closing saved (${status})`, id: r.lastID, status, difference, expectedCash });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/closings/:id", async (req, res) => {
  try {
    await run("DELETE FROM daily_closings WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Closing deleted successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- CASH BOOK STATEMENT ----------
// Cash Withdrawal and Bank Deposit no longer need a special-cased row here —
// they already arrive as proper Contra (C#) Receipt+Payment leg pairs from
// receiptRows()/paymentRows() (see contraLegs()), each carrying its fixed
// "BLUE FARM — CONTRA" / "BLUE REMOUNTS — CONTRA" source tag.
// ---------- CASH BOOK STATEMENT ----------
// Cash Withdrawal, Bank Deposit, and HO Remittance no longer need special
// handling here — Withdrawal/Deposit arrive as Contra (C#) Receipt+Payment
// leg pairs, and HO Remittance arrives as a normal Payment-side Bank row,
// all already merged into receiptRows()/paymentRows() (see contraLegs() and
// paymentRows()), each carrying its fixed "BLUE FARM — TYPE" source tag.
router.get("/statement", async (req, res) => {
  try {
    const receipts = (await receiptRows(req.query)).map((r) => ({ ...r, type: "Receipt" }));
    const payments = (await paymentRows(req.query)).map((r) => ({ ...r, type: "Payment" }));

    const rows = [...receipts, ...payments].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    let cash = 0;
    let bank = 0;
    const withdrawals = await all("SELECT * FROM cash_withdrawals");
    const statement = rows.map((r) => {
      if (r.type === "Receipt") {
        cash += num(r.cash);
        bank += num(r.bank);
      } else {
        cash -= num(r.cash);
        bank -= num(r.bank);
      }
      return { ...r, cashBalance: cash, bankBalance: bank };
    });

    res.json({ statement, withdrawals });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- BANK DEPOSITS ----------
router.get("/bank-deposits", async (req, res) => {
  try {
    const { from, to, farm } = req.query;
    let rows = await all("SELECT * FROM bank_deposits ORDER BY date(entryDate) DESC, id DESC");
    rows = rows
      .filter((r) => (from ? (r.entryDate || "") >= from : true))
      .filter((r) => (to ? (r.entryDate || "") <= to : true))
      .filter((r) => (farm ? r.farm === farm : true));
    res.json(rows);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post("/bank-deposits", async (req, res) => {
  try {
    const { farm, entryDate, voucherNo, amount, depositedBy, head, remarks } = req.body;
    const amt = num(amount);
    if (amt <= 0) return res.status(400).json({ success: false, message: "Amount is required" });
    const bal = await balances();
    if (amt > bal.cashInHand) {
      return res.status(400).json({ success: false,
        message: `Insufficient cash in hand. Available: ${moneyFmt(bal.cashInHand)}, requested: ${moneyFmt(amt)}.` });
    }
    // Fixed source indicator — this is a Contra (C#) entry, always tagged
    // with the farm this software instance is running as.
    const sourceTag = buildSourceTag(farm, "CONTRA");
    const r = await run(
      `INSERT INTO bank_deposits (farm, entryDate, voucherNo, amount, depositedBy, head, remarks, sourceTag) VALUES (?,?,?,?,?,?,?,?)`,
      [farm || null, entryDate || "", voucherNo || "", amt, depositedBy || "", head || "Milk Sale", remarks || "", sourceTag]);
    res.json({ success: true, message: "Bank deposit recorded successfully", id: r.lastID, sourceTag });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete("/bank-deposits/:id", async (req, res) => {
  try {
    await run("DELETE FROM bank_deposits WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Bank deposit deleted successfully" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ---------- HEAD OFFICE REMITTANCES ----------
router.get("/ho-remittances", async (req, res) => {
  try {
    const { from, to, farm } = req.query;
    let rows = await all("SELECT * FROM ho_remittances ORDER BY date(entryDate) DESC, id DESC");
    rows = rows
      .filter((r) => (from ? (r.entryDate || "") >= from : true))
      .filter((r) => (to ? (r.entryDate || "") <= to : true))
      .filter((r) => (farm ? r.farm === farm : true));
    res.json(rows);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post("/ho-remittances", async (req, res) => {
  try {
    const { farm, entryDate, voucherNo, bankRef, transferMode, amount, remarks, attachment } = req.body;
    const amt = num(amount);
    if (amt <= 0) return res.status(400).json({ success: false, message: "Amount is required" });
    const bal = await balances();
    if (amt > bal.cashInBank) {
      return res.status(400).json({ success: false,
        message: `Insufficient bank balance. Available: ${moneyFmt(bal.cashInBank)}, requested: ${moneyFmt(amt)}.` });
    }
    const r = await run(
      `INSERT INTO ho_remittances (farm, entryDate, voucherNo, bankRef, transferMode, amount, remarks, attachment) VALUES (?,?,?,?,?,?,?,?)`,
      [farm || null, entryDate || "", voucherNo || "", bankRef || "", transferMode || "RTGS", amt, remarks || "", attachment || ""]);
    res.json({ success: true, message: "HO Remittance recorded successfully", id: r.lastID });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put("/ho-remittances/:id", async (req, res) => {
  try {
    const row = await all("SELECT * FROM ho_remittances WHERE id=?", [req.params.id]);
    if (!row.length) return res.status(404).json({ success: false, message: "Remittance not found" });
    const { entryDate, voucherNo, bankRef, transferMode, amount, remarks, attachment } = req.body;
    const old = row[0];
    const newAmt = amount !== undefined ? num(amount) : num(old.amount);
    if (newAmt > num(old.amount)) {
      const bal = await balances();
      const effectiveBank = bal.cashInBank + num(old.amount);
      if (newAmt > effectiveBank) {
        return res.status(400).json({ success: false, message: `Insufficient bank balance. Available: ${moneyFmt(effectiveBank)}.` });
      }
    }
    await run(`UPDATE ho_remittances SET entryDate=?, voucherNo=?, bankRef=?, transferMode=?, amount=?, remarks=?, attachment=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
      [entryDate || old.entryDate, voucherNo ?? old.voucherNo, bankRef ?? old.bankRef, transferMode || old.transferMode, newAmt, remarks ?? old.remarks, attachment ?? old.attachment, req.params.id]);
    res.json({ success: true, message: "HO Remittance updated successfully" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete("/ho-remittances/:id", async (req, res) => {
  try {
    await run("DELETE FROM ho_remittances WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "HO Remittance deleted successfully" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ---------- RESET CASH DATA (clear old/test data) ----------
router.post("/reset", async (req, res) => {
  try {
    await run("DELETE FROM cashbook_receipts");
    await run("DELETE FROM cash_withdrawals");
    await run("DELETE FROM bank_deposits");
    await run("DELETE FROM temporary_receipts");
    await run("DELETE FROM daily_closings");
    res.json({ success: true, message: "All cash book data cleared. Allocations and Bills remain untouched." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
// Exposed so finance.js can check real-time Cash in Hand before saving a
// Cash bill (see routes/finance.js) — without this, that check only knew
// "has any cash ever been withdrawn", not "is there still enough left".
module.exports.balances = balances;

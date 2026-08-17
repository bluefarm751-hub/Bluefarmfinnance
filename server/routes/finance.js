const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../database/database");
const { buildSourceTag } = require("../utils/sourceTag");
const { balances: getCashbookBalances } = require("./cashbook");

// ===================================
// FILE UPLOAD SETUP (bill picture)
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

// Only allow image/PDF bill pictures, capped at 8MB — no filter/limit meant
// any file type or size could be pushed to the server.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP or PDF files are allowed"));
  },
});
const billUpload = upload.single("billPic");

// ===================================
// LIST FINANCE HEADS (with spent / remaining)
// ===================================
router.get("/heads", (req, res) => {
  const { farm } = req.query;

  let sql = `
    SELECT h.*,
      IFNULL((SELECT SUM(b.amount) FROM finance_bills b WHERE b.headId = h.id), 0) AS spent,
      (SELECT COUNT(*) FROM finance_bills b WHERE b.headId = h.id) AS billCount,
      IFNULL((SELECT SUM(a.amount) FROM finance_allocations a WHERE a.headId = h.id), 0) AS allocated,
      (SELECT COUNT(*) FROM finance_allocations a WHERE a.headId = h.id) AS allocationCount
    FROM finance_heads h
    WHERE 1=1`;
  const params = [];

  if (farm) {
    sql += " AND h.farm=?";
    params.push(farm);
  }

  sql += " ORDER BY h.createdAt DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    const data = (rows || []).map((r) => {
      // Total allocated = legacy head amount + every allocation entry of that head
      const totalAllocated = (Number(r.amount) || 0) + (Number(r.allocated) || 0);
      return {
        ...r,
        amount: totalAllocated,
        baseAmount: Number(r.amount) || 0,
        allocated: totalAllocated,
        allocationCount: Number(r.allocationCount) || 0,
        spent: Number(r.spent) || 0,
        billCount: Number(r.billCount) || 0,
        remaining: totalAllocated - (Number(r.spent) || 0),
      };
    });
    res.json(data);
  });
});

// ===================================
// GET SINGLE FINANCE HEAD
// ===================================
router.get("/heads/:id", (req, res) => {
  db.get("SELECT * FROM finance_heads WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: "Head not found" });
    res.json(row);
  });
});

// ===================================
// ADD FINANCE HEAD
// ===================================
router.post("/heads", (req, res) => {
  const { farm, headName, amount, allocationDate, letterReference, remarks } = req.body;

  if (!headName || !headName.trim()) {
    return res.status(400).json({ success: false, message: "Head name is required" });
  }

  db.run(
    `INSERT INTO finance_heads (farm, headName, amount, allocationDate, letterReference, remarks)
     VALUES (?,?,?,?,?,?)`,
    [
      farm || null,
      headName.trim(),
      parseFloat(amount) || 0,
      allocationDate || "",
      letterReference || "",
      remarks || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Head added successfully", id: this.lastID });
    }
  );
});

// ===================================
// UPDATE FINANCE HEAD
// ===================================
router.put("/heads/:id", (req, res) => {
  const { headName, amount, allocationDate, letterReference, remarks } = req.body;

  if (!headName || !headName.trim()) {
    return res.status(400).json({ success: false, message: "Head name is required" });
  }

  db.run(
    `UPDATE finance_heads
     SET headName=?, amount=?, allocationDate=?, letterReference=?, remarks=?, updatedAt=CURRENT_TIMESTAMP
     WHERE id=?`,
    [
      headName.trim(),
      parseFloat(amount) || 0,
      allocationDate || "",
      letterReference || "",
      remarks || "",
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: "Head not found" });
      res.json({ success: true, message: "Head updated successfully" });
    }
  );
});

// ===================================
// DELETE FINANCE HEAD (blocked while bills exist)
// ===================================
router.delete("/heads/:id", (req, res) => {
  db.get(
    "SELECT COUNT(*) AS billCount FROM finance_bills WHERE headId=?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (row && row.billCount > 0) {
        return res.status(400).json({
          success: false,
          message: "This head still has bills. Delete its bills first, then delete the head.",
        });
      }
      db.run("DELETE FROM finance_allocations WHERE headId=?", [req.params.id], () => {
        db.run("DELETE FROM finance_heads WHERE id=?", [req.params.id], function (err2) {
          if (err2) return res.status(500).json({ success: false, message: err2.message });
          if (this.changes === 0) return res.status(404).json({ success: false, message: "Head not found" });
          res.json({ success: true, message: "Head deleted successfully" });
        });
      });
    }
  );
});

// ===================================
// LIST ALLOCATIONS
// ===================================
router.get("/allocations", (req, res) => {
  const { farm, headId } = req.query;

  let sql = `
    SELECT a.*, h.headName AS headName
    FROM finance_allocations a
    LEFT JOIN finance_heads h ON h.id = a.headId
    WHERE 1=1`;
  const params = [];

  if (farm) {
    sql += " AND a.farm=?";
    params.push(farm);
  }
  if (headId) {
    sql += " AND a.headId=?";
    params.push(headId);
  }

  sql += " ORDER BY a.id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    const data = (rows || []).map((r) => ({
      ...r,
      sourceTag: r.sourceTag || buildSourceTag(r.farm, "ALLOCATION"),
    }));
    res.json(data);
  });
});

// ===================================
// ADD ALLOCATION (each save = separate entry, amount adds into same head)
// ===================================
router.post("/allocations", (req, res) => {
  const { farm, headId, amount, allocationDate, letterReference, remarks } = req.body;

  if (!headId) return res.status(400).json({ success: false, message: "Head is required" });
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ success: false, message: "Valid amount is required" });

  // Fixed source indicator — always derived from the farm this software
  // instance is running as (Blue Farm / Blue Remounts), never picked manually.
  const sourceTag = buildSourceTag(farm, "ALLOCATION");

  db.run(
    `INSERT INTO finance_allocations (farm, headId, amount, allocationDate, letterReference, remarks, sourceTag)
     VALUES (?,?,?,?,?,?,?)`,
    [farm || null, headId, amt, allocationDate || "", letterReference || "", remarks || "", sourceTag],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Allocation added successfully", id: this.lastID, sourceTag });
    }
  );
});

// ===================================
// UPDATE ALLOCATION
// ===================================
router.put("/allocations/:id", (req, res) => {
  const { headId, amount, allocationDate, letterReference, remarks } = req.body;

  db.get("SELECT * FROM finance_allocations WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: "Allocation not found" });

    db.run(
      `UPDATE finance_allocations
       SET headId=?, amount=?, allocationDate=?, letterReference=?, remarks=?, updatedAt=CURRENT_TIMESTAMP
       WHERE id=?`,
      [
        headId || row.headId,
        parseFloat(amount) || 0,
        allocationDate || "",
        letterReference || "",
        remarks || "",
        req.params.id,
      ],
      function (err2) {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        res.json({ success: true, message: "Allocation updated successfully" });
      }
    );
  });
});

// ===================================
// DELETE ALLOCATION
// ===================================
router.delete("/allocations/:id", (req, res) => {
  db.run("DELETE FROM finance_allocations WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, message: "Allocation not found" });
    res.json({ success: true, message: "Allocation deleted successfully" });
  });
});

// ===================================
// LIST BILLS
// ===================================
router.get("/bills", (req, res) => {
  const { farm, headId } = req.query;

  let sql = `
    SELECT b.*, h.headName AS headName
    FROM finance_bills b
    LEFT JOIN finance_heads h ON h.id = b.headId
    WHERE 1=1`;
  const params = [];

  if (farm) {
    sql += " AND b.farm=?";
    params.push(farm);
  }
  if (headId) {
    sql += " AND b.headId=?";
    params.push(headId);
  }

  sql += " ORDER BY b.sNo ASC, b.id ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    const data = (rows || []).map((r) => ({
      ...r,
      sourceTag: r.sourceTag || buildSourceTag(r.farm, "BILL"),
    }));
    res.json(data);
  });
});

// ===================================
// ADD BILL
// ===================================
router.post("/bills", billUpload, (req, res) => {
  const { farm, headId, contractorName, item, qty, price, amount, paymentMode, remarks, billDate, status, chequeNo, chequeDate } = req.body;

  if (!headId) {
    return res.status(400).json({ success: false, message: "Head is required" });
  }

  // Check if Cash payment mode requires enough actual Cash in Hand — not
  // just "has cash ever been withdrawn" (that let cash bills overspend past
  // what was actually withdrawn, which is exactly what pushed Cash in Hand
  // negative in the Cash Book / Daily Closing).
  if (!paymentMode || paymentMode === "Cash") {
    const cashAmt = parseFloat(amount) || 0;
    getCashbookBalances()
      .then((bal) => {
        if (cashAmt > bal.cashInHand) {
          return res.status(400).json({
            success: false,
            message: `Insufficient cash in hand. Available: Rs. ${Number(bal.cashInHand).toLocaleString()}, requested: Rs. ${cashAmt.toLocaleString()}. Please withdraw more cash from the bank first.`,
          });
        }
        proceedToSaveBill();
      })
      .catch((err) => res.status(500).json({ success: false, message: err.message }));
  } else {
    proceedToSaveBill();
  }

  function proceedToSaveBill() {
    const billPic = req.file ? `/uploads/${req.file.filename}` : null;
    // Fixed source indicator — always derived from the farm this software
    // instance is running as (Blue Farm / Blue Remounts), never picked manually.
    const sourceTag = buildSourceTag(farm, "BILL");

    db.get(
      "SELECT IFNULL(MAX(sNo),0) + 1 AS nextNo FROM finance_bills WHERE farm IS ? OR farm = ?",
      [farm || null, farm || null],
      (err, row) => {
        const sNo = err || !row ? 1 : row.nextNo;

        db.run(
          `INSERT INTO finance_bills (farm, sNo, headId, contractorName, item, qty, price, amount, paymentMode, chequeNo, chequeDate, remarks, billPic, billDate, status, sourceTag)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            farm || null,
            sNo,
            headId,
            contractorName || "",
            item || "",
            parseFloat(qty) || 0,
            parseFloat(price) || 0,
            parseFloat(amount) || 0,
            paymentMode || "Cash",
            chequeNo || "",
            chequeDate || "",
            remarks || "",
            billPic,
            billDate || "",
            status || "Not Paid",
            sourceTag,
          ],
          function (err2) {
            if (err2) return res.status(500).json({ success: false, message: err2.message });
            res.json({ success: true, message: "Bill added successfully", id: this.lastID, sNo, sourceTag });
          }
        );
      }
    );
  }
});

// ===================================
// UPDATE BILL
// ===================================
router.put("/bills/:id", billUpload, (req, res) => {
  const { headId, contractorName, item, qty, price, amount, paymentMode, remarks, billDate, status, chequeNo, chequeDate, removeBillPic } = req.body;

  db.get("SELECT * FROM finance_bills WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: "Bill not found" });

    const wantsRemove = removeBillPic === "true" || removeBillPic === true;
    const billPic = req.file ? `/uploads/${req.file.filename}` : wantsRemove ? null : row.billPic;

    // Clean up the old file from disk when it's being replaced or removed.
    if ((req.file || wantsRemove) && row.billPic) {
      fs.unlink(path.join(uploadDir, path.basename(row.billPic)), () => {}); // best-effort
    }

    db.run(
      `UPDATE finance_bills
       SET headId=?, contractorName=?, item=?, qty=?, price=?, amount=?, paymentMode=?, chequeNo=?, chequeDate=?, remarks=?, billPic=?, billDate=?, status=?, updatedAt=CURRENT_TIMESTAMP
       WHERE id=?`,
      [
        headId || row.headId,
        contractorName || "",
        item || "",
        parseFloat(qty) || 0,
        parseFloat(price) || 0,
        parseFloat(amount) || 0,
        paymentMode || row.paymentMode || "Cash",
        chequeNo || row.chequeNo || "",
        chequeDate || row.chequeDate || "",
        remarks || "",
        billPic,
        billDate || row.billDate || "",
        status || row.status || "Not Paid",
        req.params.id,
      ],
      function (err2) {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        res.json({ success: true, message: "Bill updated successfully" });
      }
    );
  });
});

// ===================================
// DELETE BILL
// ===================================
router.delete("/bills/:id", (req, res) => {
  db.run("DELETE FROM finance_bills WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, message: "Bill not found" });
    res.json({ success: true, message: "Bill deleted successfully" });
  });
});

// ===================================
// CONTINGENT BILLS (voucher-style, informational only — not linked to a
// head's balance). Each voucher has a header + multiple line items.
// ===================================

// ---- LIST (with items + head name + total) ----
router.get("/contingent-bills", (req, res) => {
  const { farm, month, year, headId } = req.query;

  let sql = `
    SELECT cb.*, COALESCE(cb.paymentHead, h.headName) AS headName
    FROM finance_contingent_bills cb
    LEFT JOIN finance_heads h ON h.id = cb.headId
    WHERE 1=1`;
  const params = [];

  if (farm) {
    sql += " AND cb.farm=?";
    params.push(farm);
  }
  if (month) {
    sql += " AND cb.month=?";
    params.push(month);
  }
  if (year) {
    sql += " AND cb.year=?";
    params.push(year);
  }
  if (headId) {
    sql += " AND cb.headId=?";
    params.push(headId);
  }

  sql += " ORDER BY cb.id DESC";

  db.all(sql, params, (err, bills) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!bills || bills.length === 0) return res.json([]);

    const ids = bills.map((b) => b.id);
    const placeholders = ids.map(() => "?").join(",");

    db.all(
      `SELECT * FROM finance_contingent_bill_items WHERE contingentBillId IN (${placeholders}) ORDER BY contingentBillId ASC, sortOrder ASC, id ASC`,
      ids,
      (err2, items) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });

        const itemsByBill = {};
        (items || []).forEach((it) => {
          if (!itemsByBill[it.contingentBillId]) itemsByBill[it.contingentBillId] = [];
          itemsByBill[it.contingentBillId].push(it);
        });

        const data = bills.map((b) => ({ ...b, items: itemsByBill[b.id] || [] }));
        res.json(data);
      }
    );
  });
});

// ---- GET SINGLE (with items) ----
router.get("/contingent-bills/:id", (req, res) => {
  db.get(
    `SELECT cb.*, COALESCE(cb.paymentHead, h.headName) AS headName
     FROM finance_contingent_bills cb
     LEFT JOIN finance_heads h ON h.id = cb.headId
     WHERE cb.id=?`,
    [req.params.id],
    (err, bill) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (!bill) return res.status(404).json({ success: false, message: "Contingent bill not found" });

      db.all(
        "SELECT * FROM finance_contingent_bill_items WHERE contingentBillId=? ORDER BY sortOrder ASC, id ASC",
        [req.params.id],
        (err2, items) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });
          res.json({ ...bill, items: items || [] });
        }
      );
    }
  );
});

// ---- ADD ----
router.post("/contingent-bills", (req, res) => {
  const {
    farm, voucherNo, month, year, headId, paymentHead, paymentToMS, authority,
    totalAmount, amountInWords, chequeNo, chequeDate,
    receivedByName, receivedByRank, items,
  } = req.body;

  if (!paymentToMS || !paymentToMS.trim()) {
    return res.status(400).json({ success: false, message: "Payment to M/S is required" });
  }

  let parsedItems = [];
  try {
    parsedItems = typeof items === "string" ? JSON.parse(items) : items || [];
  } catch (e) {
    return res.status(400).json({ success: false, message: "Invalid items data" });
  }
  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({ success: false, message: "At least one bill row is required" });
  }

  db.run(
    `INSERT INTO finance_contingent_bills
      (farm, voucherNo, month, year, headId, paymentHead, paymentToMS, authority, totalAmount, amountInWords, chequeNo, chequeDate, receivedByName, receivedByRank)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      farm || null,
      voucherNo || "",
      month || "",
      year || "",
      headId || null,
      paymentHead || "",
      paymentToMS.trim(),
      authority || "",
      parseFloat(totalAmount) || 0,
      amountInWords || "",
      chequeNo || "",
      chequeDate || "",
      receivedByName || "",
      receivedByRank || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      const billId = this.lastID;

      const stmt = db.prepare(
        `INSERT INTO finance_contingent_bill_items (contingentBillId, billNo, billDate, description, amount, sortOrder)
         VALUES (?,?,?,?,?,?)`
      );
      parsedItems.forEach((it, idx) => {
        stmt.run([billId, it.billNo || "", it.billDate || "", it.description || "", parseFloat(it.amount) || 0, idx]);
      });
      stmt.finalize((err2) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        res.json({ success: true, message: "Contingent bill added successfully", id: billId });
      });
    }
  );
});

// ---- UPDATE ----
router.put("/contingent-bills/:id", (req, res) => {
  const {
    voucherNo, month, year, headId, paymentHead, paymentToMS, authority,
    totalAmount, amountInWords, chequeNo, chequeDate,
    receivedByName, receivedByRank, items,
  } = req.body;

  db.get("SELECT * FROM finance_contingent_bills WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: "Contingent bill not found" });

    let parsedItems = null;
    if (items !== undefined) {
      try {
        parsedItems = typeof items === "string" ? JSON.parse(items) : items;
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid items data" });
      }
    }

    db.run(
      `UPDATE finance_contingent_bills
       SET voucherNo=?, month=?, year=?, headId=?, paymentHead=?, paymentToMS=?, authority=?, totalAmount=?, amountInWords=?, chequeNo=?, chequeDate=?, receivedByName=?, receivedByRank=?, updatedAt=CURRENT_TIMESTAMP
       WHERE id=?`,
      [
        voucherNo ?? row.voucherNo,
        month ?? row.month,
        year ?? row.year,
        headId ?? row.headId,
        paymentHead ?? row.paymentHead,
        String(paymentToMS ?? row.paymentToMS ?? "").trim(),
        authority ?? row.authority,
        totalAmount !== undefined ? parseFloat(totalAmount) || 0 : row.totalAmount,
        amountInWords ?? row.amountInWords,
        chequeNo ?? row.chequeNo,
        chequeDate ?? row.chequeDate,
        receivedByName ?? row.receivedByName,
        receivedByRank ?? row.receivedByRank,
        req.params.id,
      ],
      function (err2) {
        if (err2) return res.status(500).json({ success: false, message: err2.message });

        if (!parsedItems) {
          return res.json({ success: true, message: "Contingent bill updated successfully" });
        }

        db.run("DELETE FROM finance_contingent_bill_items WHERE contingentBillId=?", [req.params.id], (err3) => {
          if (err3) return res.status(500).json({ success: false, message: err3.message });

          const stmt = db.prepare(
            `INSERT INTO finance_contingent_bill_items (contingentBillId, billNo, billDate, description, amount, sortOrder)
             VALUES (?,?,?,?,?,?)`
          );
          parsedItems.forEach((it, idx) => {
            stmt.run([req.params.id, it.billNo || "", it.billDate || "", it.description || "", parseFloat(it.amount) || 0, idx]);
          });
          stmt.finalize((err4) => {
            if (err4) return res.status(500).json({ success: false, message: err4.message });
            res.json({ success: true, message: "Contingent bill updated successfully" });
          });
        });
      }
    );
  });
});

// ---- DELETE ----
router.delete("/contingent-bills/:id", (req, res) => {
  db.run("DELETE FROM finance_contingent_bill_items WHERE contingentBillId=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    db.run("DELETE FROM finance_contingent_bills WHERE id=?", [req.params.id], function (err2) {
      if (err2) return res.status(500).json({ success: false, message: err2.message });
      if (this.changes === 0) return res.status(404).json({ success: false, message: "Contingent bill not found" });
      res.json({ success: true, message: "Contingent bill deleted successfully" });
    });
  });
});

module.exports = router;

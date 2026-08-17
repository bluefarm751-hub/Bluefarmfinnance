const express = require("express");
const router = express.Router();

const db = require("../database/database");

// ===================================
// GET ACTIVE EMPLOYEES FOR A FARM (Update Salary -> Load Employee)
// ===================================
router.get("/active-employees", (req, res) => {
  const { farm } = req.query;

  let sql = "SELECT * FROM employees WHERE status='Active'";
  const params = [];

  if (farm) {
    sql += " AND farm=?";
    params.push(farm);
  }

  sql += " ORDER BY name ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

// ===================================
// CHECK IF A SALARY BATCH ALREADY EXISTS (farm + month + year)
// ===================================
router.get("/batch-exists", (req, res) => {
  const { farm, month, year } = req.query;

  db.get(
    "SELECT COUNT(*) as cnt FROM payroll WHERE farm=? AND month=? AND year=?",
    [farm, month, year],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ exists: row.cnt > 0 });
    }
  );
});

// ===================================
// LIST ALL GENERATED BATCHES FOR A FARM (Undo Salary dropdown)
// ===================================
router.get("/batches", (req, res) => {
  const { farm } = req.query;

  let sql = `
    SELECT farm, month, year, COUNT(*) as employeeCount, SUM(netSalary) as totalNet
    FROM payroll
  `;
  const params = [];

  if (farm) {
    sql += " WHERE farm=?";
    params.push(farm);
  }

  sql += " GROUP BY farm, month, year ORDER BY year DESC, month DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

// ===================================
// GENERATE SALARY (save a calculated batch)
// ===================================
router.post("/generate", (req, res) => {
  const { farm, month, year, rows } = req.body;

  if (!farm || !month || !year || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "farm, month, year and rows are required" });
  }

  // Prevent duplicate generation for the same farm/month/year - must Undo first
  db.get(
    "SELECT COUNT(*) as cnt FROM payroll WHERE farm=? AND month=? AND year=?",
    [farm, month, year],
    (err, row) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      if (row.cnt > 0) {
        return res.status(409).json({
          success: false,
          message: `Salary for ${month} ${year} (${farm}) is already generated. Use Undo Salary first to regenerate.`,
        });
      }

      const sql = `
        INSERT INTO payroll (
          employeeId, employeeNo, employeeName, department, farm,
          month, year, grossSalary, days, arrear, netSalary,
          paymentStatus, remarks, appointment, bankName, iban
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      const stmt = db.prepare(sql);
      let failed = false;

      rows.forEach((r) => {
        stmt.run(
          [
            r.employeeId,
            r.employeeNo,
            r.employeeName,
            r.department,
            farm,
            month,
            year,
            r.grossSalary,
            r.days,
            r.arrear || 0,
            r.netSalary,
            "Unpaid",
            r.remarks || "",
            r.appointment || "",
            r.bankName || "",
            r.iban || "",
          ],
          (err2) => {
            if (err2) failed = true;
          }
        );
      });

      stmt.finalize((err3) => {
        if (err3 || failed) {
          return res.status(500).json({ success: false, message: "Some rows failed to save" });
        }
        res.json({ success: true, message: "Salary generated successfully", count: rows.length });
      });
    }
  );
});

// ===================================
// REPORT SALARY (list for a farm/month/year)
// ===================================
router.get("/report", (req, res) => {
  const { farm, month, year } = req.query;

  let sql = "SELECT * FROM payroll WHERE 1=1";
  const params = [];

  if (farm) {
    sql += " AND farm=?";
    params.push(farm);
  }
  if (month) {
    sql += " AND month=?";
    params.push(month);
  }
  if (year) {
    sql += " AND year=?";
    params.push(year);
  }

  sql += " ORDER BY employeeName ASC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

// ===================================
// LIST EMPLOYEES WITHIN ONE GENERATED BATCH (Undo Salary - single employee list)
// ===================================
router.get("/batch-employees", (req, res) => {
  const { farm, month, year } = req.query;

  if (!farm || !month || !year) {
    return res.status(400).json({ success: false, message: "farm, month and year are required" });
  }

  db.all(
    "SELECT * FROM payroll WHERE farm=? AND month=? AND year=? ORDER BY employeeName ASC",
    [farm, month, year],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json(rows);
    }
  );
});

// ===================================
// UNDO SALARY (delete a generated batch so it can be redone)
// ===================================
router.delete("/undo", (req, res) => {
  const { farm, month, year } = req.query;

  if (!farm || !month || !year) {
    return res.status(400).json({ success: false, message: "farm, month and year are required" });
  }

  db.run(
    "DELETE FROM payroll WHERE farm=? AND month=? AND year=?",
    [farm, month, year],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: "Salary batch undone", deleted: this.changes });
    }
  );
});

// ===================================
// UNDO SALARY FOR A SINGLE EMPLOYEE (delete one payroll row only)
// ===================================
router.delete("/undo-employee/:id", (req, res) => {
  db.run(
    "DELETE FROM payroll WHERE id=?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: err.message });

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: "Payroll entry not found" });
      }

      res.json({ success: true, message: "Employee salary entry undone", deleted: this.changes });
    }
  );
});

module.exports = router;

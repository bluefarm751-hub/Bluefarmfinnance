const express = require("express");
const router = express.Router();

const db = require("../database/database");

// ============================================================
// GET ACTIVE EMPLOYEES FOR A FARM
// ============================================================
router.get("/active-employees", async (req, res) => {
  try {
    const { farm } = req.query;

    let sql = `
      SELECT *
      FROM employees
      WHERE status = 'Active'
    `;

    const params = [];

    if (farm) {
      params.push(farm);
      sql += ` AND farm = $${params.length}`;
    }

    sql += ` ORDER BY name ASC`;

    const result = await db.query(sql, params);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /active-employees:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// CHECK IF SALARY BATCH ALREADY EXISTS
// farm + month + year
// ============================================================
router.get("/batch-exists", async (req, res) => {
  try {
    const { farm, month, year } = req.query;

    const result = await db.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM payroll
      WHERE farm = $1
        AND month = $2
        AND year = $3
      `,
      [farm, month, year]
    );

    res.json({
      exists: Number(result.rows[0].cnt) > 0,
    });
  } catch (err) {
    console.error("GET /batch-exists:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// LIST ALL GENERATED SALARY BATCHES
// ============================================================
router.get("/batches", async (req, res) => {
  try {
    const { farm } = req.query;

    let sql = `
      SELECT
        farm,
        month,
        year,
        COUNT(*)::int AS "employeeCount",
        COALESCE(SUM("netSalary"), 0) AS "totalNet"
      FROM payroll
    `;

    const params = [];

    if (farm) {
      params.push(farm);
      sql += ` WHERE farm = $${params.length}`;
    }

    sql += `
      GROUP BY farm, month, year
      ORDER BY year DESC, month DESC
    `;

    const result = await db.query(sql, params);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /batches:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// GENERATE SALARY
// ============================================================
router.post("/generate", async (req, res) => {
  const client = await db.connect();

  try {
    const {
      farm,
      month,
      year,
      rows,
    } = req.body;

    if (
      !farm ||
      !month ||
      !year ||
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "farm, month, year and rows are required",
      });
    }

    // --------------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------------
    await client.query("BEGIN");

    // --------------------------------------------------------
    // PREVENT DUPLICATE SALARY GENERATION
    // --------------------------------------------------------
    const checkResult = await client.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM payroll
      WHERE farm = $1
        AND month = $2
        AND year = $3
      `,
      [farm, month, year]
    );

    if (Number(checkResult.rows[0].cnt) > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          `Salary for ${month} ${year} (${farm}) is already generated. ` +
          `Use Undo Salary first to regenerate.`,
      });
    }

    // --------------------------------------------------------
    // INSERT ALL SALARY ROWS
    // --------------------------------------------------------
    const sql = `
      INSERT INTO payroll
      (
        "employeeId",
        "employeeNo",
        "employeeName",
        department,
        farm,
        month,
        year,
        "grossSalary",
        days,
        arrear,
        "netSalary",
        "paymentStatus",
        remarks,
        appointment,
        "bankName",
        iban
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,$16
      )
      RETURNING id
    `;

    const insertedIds = [];

    for (const r of rows) {
      const result = await client.query(sql, [
        r.employeeId || null,
        r.employeeNo || "",
        r.employeeName || "",
        r.department || "",
        farm,
        month,
        year,
        Number(r.grossSalary) || 0,
        Number(r.days) || 0,
        Number(r.arrear) || 0,
        Number(r.netSalary) || 0,
        "Unpaid",
        r.remarks || "",
        r.appointment || "",
        r.bankName || "",
        r.iban || "",
      ]);

      insertedIds.push(result.rows[0].id);
    }

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------
    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Salary generated successfully",
      count: insertedIds.length,
      ids: insertedIds,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("POST /generate:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    client.release();
  }
});

// ============================================================
// REPORT SALARY
// ============================================================
router.get("/report", async (req, res) => {
  try {
    const {
      farm,
      month,
      year,
    } = req.query;

    let sql = `
      SELECT *
      FROM payroll
      WHERE 1=1
    `;

    const params = [];

    if (farm) {
      params.push(farm);
      sql += ` AND farm = $${params.length}`;
    }

    if (month) {
      params.push(month);
      sql += ` AND month = $${params.length}`;
    }

    if (year) {
      params.push(year);
      sql += ` AND year = $${params.length}`;
    }

    sql += `
      ORDER BY "employeeName" ASC
    `;

    const result = await db.query(sql, params);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /report:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// LIST EMPLOYEES WITHIN GENERATED BATCH
// ============================================================
router.get("/batch-employees", async (req, res) => {
  try {
    const {
      farm,
      month,
      year,
    } = req.query;

    if (!farm || !month || !year) {
      return res.status(400).json({
        success: false,
        message:
          "farm, month and year are required",
      });
    }

    const result = await db.query(
      `
      SELECT *
      FROM payroll
      WHERE farm = $1
        AND month = $2
        AND year = $3
      ORDER BY "employeeName" ASC
      `,
      [farm, month, year]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /batch-employees:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// UNDO SALARY BATCH
// ============================================================
router.delete("/undo", async (req, res) => {
  try {
    const {
      farm,
      month,
      year,
    } = req.query;

    if (!farm || !month || !year) {
      return res.status(400).json({
        success: false,
        message:
          "farm, month and year are required",
      });
    }

    const result = await db.query(
      `
      DELETE FROM payroll
      WHERE farm = $1
        AND month = $2
        AND year = $3
      `,
      [farm, month, year]
    );

    res.json({
      success: true,
      message: "Salary batch undone",
      deleted: result.rowCount,
    });
  } catch (err) {
    console.error("DELETE /undo:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================================
// UNDO SALARY FOR ONE EMPLOYEE
// ============================================================
router.delete("/undo-employee/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
      DELETE FROM payroll
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Payroll entry not found",
      });
    }

    res.json({
      success: true,
      message:
        "Employee salary entry undone",
      deleted: result.rowCount,
    });
  } catch (err) {
    console.error(
      "DELETE /undo-employee:",
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
const express = require("express");
const router = express.Router();

const db = require("../database/database");

const MONTH_NUMBER = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};


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
// ATTENDANCE REGISTER
// Optional payroll attendance: only employees with at least one
// saved attendance record get attendance-based salary days.
// ============================================================
router.get("/attendance", async (req, res) => {
  try {
    const { farm, month, year } = req.query;

    if (!farm || !month || !year) {
      return res.status(400).json({ success: false, message: "farm, month and year are required" });
    }

    const monthNumber = MONTH_NUMBER[month];
    if (!monthNumber) {
      return res.status(400).json({ success: false, message: "Invalid month" });
    }

    const result = await db.query(
      `
      SELECT
        e.id,
        e."employeeNo",
        e.name,
        e.department,
        e."grossSalary",
        COALESCE(
          json_agg(
            json_build_object(
              'date', to_char(a."attendanceDate", 'YYYY-MM-DD'),
              'status', a.status
            ) ORDER BY a."attendanceDate"
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS attendance,
        COUNT(a.id)::int AS "markedDays"
      FROM employees e
      LEFT JOIN attendance a
        ON a."employeeId" = e.id
       AND a.farm = $1
       AND EXTRACT(MONTH FROM a."attendanceDate") = $2
       AND EXTRACT(YEAR FROM a."attendanceDate") = $3
      WHERE e.status = 'Active'
        AND e.farm = $1
      GROUP BY e.id
      ORDER BY e.name ASC
      `,
      [farm, monthNumber, Number(year)]
    );

    const rows = result.rows.map((r) => {
      const counts = { P: 0, A: 0, L: 0 };
      for (const item of r.attendance || []) counts[item.status] = (counts[item.status] || 0) + 1;
      return {
        ...r,
        attendance: r.attendance || [],
        present: counts.P,
        absent: counts.A,
        leave: counts.L,
        hasAttendance: Number(r.markedDays) > 0,
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("GET /attendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/attendance/save", async (req, res) => {
  const client = await db.connect();
  try {
    const { farm, month, year, employeeId, employeeNo, employeeName, records } = req.body;

    if (!farm || !month || !year || !employeeId || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: "farm, month, year, employeeId and records are required" });
    }

    const monthNumber = MONTH_NUMBER[month];
    if (!monthNumber) {
      return res.status(400).json({ success: false, message: "Invalid month" });
    }

    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM attendance
      WHERE "employeeId" = $1
        AND farm = $2
        AND EXTRACT(MONTH FROM "attendanceDate") = $3
        AND EXTRACT(YEAR FROM "attendanceDate") = $4
      `,
      [employeeId, farm, monthNumber, Number(year)]
    );

    const valid = records.filter((r) => r?.date && ["P", "A", "L"].includes(r.status));

    for (const record of valid) {
      const d = new Date(`${record.date}T00:00:00`);
      if (Number.isNaN(d.getTime()) || d.getMonth() !== monthNumber - 1 || d.getFullYear() !== Number(year)) continue;

      await client.query(
        `
        INSERT INTO attendance
          ("employeeId", "employeeNo", "employeeName", farm, "attendanceDate", status)
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [employeeId, employeeNo || "", employeeName || "", farm, record.date, record.status]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Attendance saved successfully",
      markedDays: valid.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /attendance/save:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

router.get("/attendance/summary", async (req, res) => {
  try {
    const { farm, month, year } = req.query;
    if (!farm || !month || !year) {
      return res.status(400).json({ success: false, message: "farm, month and year are required" });
    }
    const monthNumber = MONTH_NUMBER[month];
    if (!monthNumber) return res.status(400).json({ success: false, message: "Invalid month" });

    const result = await db.query(
      `
      SELECT
        "employeeId",
        COUNT(*)::int AS "markedDays",
        COUNT(*) FILTER (WHERE status = 'P')::int AS present,
        COUNT(*) FILTER (WHERE status = 'A')::int AS absent,
        COUNT(*) FILTER (WHERE status = 'L')::int AS leave
      FROM attendance
      WHERE farm = $1
        AND EXTRACT(MONTH FROM "attendanceDate") = $2
        AND EXTRACT(YEAR FROM "attendanceDate") = $3
      GROUP BY "employeeId"
      `,
      [farm, monthNumber, Number(year)]
    );

    res.json(result.rows.map((r) => ({ ...r, hasAttendance: Number(r.markedDays) > 0 })));
  } catch (err) {
    console.error("GET /attendance/summary:", err);
    res.status(500).json({ success: false, message: err.message });
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
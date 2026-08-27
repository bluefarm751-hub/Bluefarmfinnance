const db = require("./database");
const { hashPassword } = require("../utils/passwordHash");

async function initDatabase() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // ============================================================
    // EMPLOYEES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        photo TEXT,
        "employeeNo" TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        "fatherName" TEXT,
        cnic TEXT,
        mobile TEXT,
        "familyMobile" TEXT,
        address TEXT,
        appointment TEXT,
        department TEXT,
        farm TEXT,
        "joiningDate" TEXT,
        "employeeType" TEXT,
        status TEXT DEFAULT 'Active',
        "grossSalary" NUMERIC DEFAULT 0,
        "bankName" TEXT,
        "accountTitle" TEXT,
        iban TEXT,
        "cnicCopy" TEXT,
        remarks TEXT,
        "maritalStatus" TEXT,
        "policeVerification" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // PAYROLL
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER,
        "employeeNo" TEXT,
        "employeeName" TEXT,
        department TEXT,
        farm TEXT,
        month TEXT,
        year TEXT,
        "grossSalary" NUMERIC DEFAULT 0,
        advance NUMERIC DEFAULT 0,
        loan NUMERIC DEFAULT 0,
        deduction NUMERIC DEFAULT 0,
        bonus NUMERIC DEFAULT 0,
        days NUMERIC DEFAULT 0,
        arrear NUMERIC DEFAULT 0,
        "netSalary" NUMERIC DEFAULT 0,
        "paymentStatus" TEXT DEFAULT 'Unpaid',
        "paymentDate" TEXT,
        remarks TEXT,
        appointment TEXT,
        "bankName" TEXT,
        iban TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // ATTENDANCE
    // Optional payroll attendance. Only saved attendance affects
    // payroll; employees without attendance keep existing salary behavior.
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        "employeeNo" TEXT,
        "employeeName" TEXT,
        farm TEXT NOT NULL,
        "attendanceDate" DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('P','A','L')),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("employeeId", farm, "attendanceDate")
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_farm_date
      ON attendance (farm, "attendanceDate")
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
      ON attendance ("employeeId", "attendanceDate")
    `);

    // ============================================================
    // FINANCE HEADS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_heads (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "headName" TEXT NOT NULL,
        amount NUMERIC DEFAULT 0,
        "paymentMode" TEXT DEFAULT 'Cash',
        "chequeNo" TEXT,
        "chequeDate" TEXT,
        remarks TEXT,
        "allocationDate" TEXT,
        "letterReference" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // FINANCE ALLOCATIONS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_allocations (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "headId" INTEGER NOT NULL,
        amount NUMERIC DEFAULT 0,
        "allocationDate" TEXT,
        "letterReference" TEXT,
        remarks TEXT,
        "sourceTag" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // FINANCE BILLS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_bills (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "sNo" INTEGER,
        "headId" INTEGER NOT NULL,
        "contractorName" TEXT,
        item TEXT,
        qty NUMERIC DEFAULT 0,
        price NUMERIC DEFAULT 0,
        amount NUMERIC DEFAULT 0,
        "paymentMode" TEXT DEFAULT 'Cash',
        "chequeNo" TEXT,
        "chequeDate" TEXT,
        remarks TEXT,
        "billPic" TEXT,
        "billDate" TEXT,
        status TEXT DEFAULT 'Not Paid',
        "sourceTag" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // CONTINGENT BILLS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_contingent_bills (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "voucherNo" TEXT,
        month TEXT,
        year TEXT,
        "headId" INTEGER,
        "paymentToMS" TEXT,
        authority TEXT,
        "totalAmount" NUMERIC DEFAULT 0,
        "amountInWords" TEXT,
        "chequeNo" TEXT,
        "chequeDate" TEXT,
        "receivedByName" TEXT,
        "receivedByRank" TEXT,
        "paymentHead" TEXT,
        printed BOOLEAN DEFAULT false,
        "printedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Older databases created before the "printed" tracking was added won't
    // have these columns yet — add them if missing so existing installs
    // pick up the feature without a manual migration.
    await client.query(`
      ALTER TABLE finance_contingent_bills
      ADD COLUMN IF NOT EXISTS printed BOOLEAN DEFAULT false
    `);
    await client.query(`
      ALTER TABLE finance_contingent_bills
      ADD COLUMN IF NOT EXISTS "printedAt" TIMESTAMP
    `);

    // ============================================================
    // CONTINGENT BILL ITEMS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_contingent_bill_items (
        id SERIAL PRIMARY KEY,
        "contingentBillId" INTEGER NOT NULL,
        "billNo" TEXT,
        "billDate" TEXT,
        description TEXT,
        amount NUMERIC DEFAULT 0,
        "sortOrder" INTEGER DEFAULT 0
      )
    `);

    // ============================================================
    // USERS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL,
        farm TEXT,
        permissions JSONB DEFAULT NULL
      )
    `);

    // Existing installations: add permissions without requiring a manual migration.
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL`);

    // ============================================================
    // DEFAULT USERS
    // ============================================================
    const users = [
      [
        "admin",
        hashPassword("admin123"),
        "Administrator",
        "admin",
        null,
      ],
      [
        "acctoffice",
        hashPassword("acct123"),
        "Accounts Office",
        "admin",
        null,
      ],
      [
        "bluefarm",
        hashPassword("bluefarm123"),
        "Blue Farm Office",
        "farm",
        "Blue Farm",
      ],
      [
        "blueremounts",
        hashPassword("remounts123"),
        "Blue Remounts Office",
        "farm",
        "Blue Remounts",
      ],
    ];

    for (const user of users) {
      await client.query(
        `
        INSERT INTO users
          (username, password, name, role, farm)
        VALUES
          ($1, $2, $3, $4, $5)
        ON CONFLICT (username)
        DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          farm = EXCLUDED.farm
        `,
        user
      );
    }

    await client.query("COMMIT");

    console.log("======================================");
    console.log("✅ PostgreSQL Database Initialized");
    console.log("✅ Employees table ready");
    console.log("✅ Payroll table ready");
    console.log("✅ Finance tables ready");
    console.log("✅ Users table ready");
    console.log("======================================");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Database initialization failed:");
    console.error(err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = initDatabase;

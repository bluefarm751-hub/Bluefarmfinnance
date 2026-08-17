const db = require("./database");

db.serialize(() => {

  // Employees
  db.run(`
  CREATE TABLE IF NOT EXISTS employees (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      photo TEXT,

      employeeNo TEXT UNIQUE NOT NULL,

      name TEXT NOT NULL,

      fatherName TEXT,

      cnic TEXT,

      mobile TEXT,

      familyMobile TEXT,

      address TEXT,

      appointment TEXT,

      department TEXT,

      farm TEXT,

      joiningDate TEXT,

      employeeType TEXT,

      status TEXT DEFAULT 'Active',

      grossSalary REAL,

      bankName TEXT,

      accountTitle TEXT,

      iban TEXT,

      cnicCopy TEXT,

      remarks TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP

  )
  `);

  console.log("✅ Employees Table Created");

  // Add extra employee columns if the table already existed without them
  const employeeCols = ["maritalStatus TEXT", "policeVerification TEXT"];
  employeeCols.forEach((colDef) => {
    db.run(`ALTER TABLE employees ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.log(err.message);
      }
    });
  });


  // Payroll Table
  db.run(`
  CREATE TABLE IF NOT EXISTS payroll (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      employeeId INTEGER NOT NULL,

      employeeNo TEXT,

      employeeName TEXT,

      department TEXT,

      month TEXT,

      year TEXT,

      grossSalary REAL,

      advance REAL DEFAULT 0,

      loan REAL DEFAULT 0,

      deduction REAL DEFAULT 0,

      bonus REAL DEFAULT 0,

      netSalary REAL,

      paymentStatus TEXT DEFAULT 'Unpaid',

      paymentDate TEXT,

      remarks TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP

  )
  `);

  console.log("✅ Payroll Table Created");

  // Add extra payroll columns if the table already existed without them
  const payrollCols = ["farm TEXT", "days REAL", "arrear REAL DEFAULT 0", "appointment TEXT", "bankName TEXT", "iban TEXT"];
  payrollCols.forEach((colDef) => {
    const colName = colDef.split(" ")[0];
    db.run(`ALTER TABLE payroll ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.log(err.message);
      }
    });
  });

  // Finance Heads Table (Add Head -> Finance dashboard cards)
  db.run(`
  CREATE TABLE IF NOT EXISTS finance_heads (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      farm TEXT,

      headName TEXT NOT NULL,

      amount REAL DEFAULT 0,
      paymentMode TEXT DEFAULT 'Cash',
      chequeNo TEXT,
      chequeDate TEXT,

      remarks TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP

  )
  `);

  console.log("✅ Finance Heads Table Created");

  // Extra finance head columns (allocation date + letter reference)
  ["allocationDate TEXT", "letterReference TEXT"].forEach((colDef) => {
    db.run(`ALTER TABLE finance_heads ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.log(err.message);
      }
    });
  });

  // Finance Allocations Table (Add Allocation -> multiple entries per head)
  db.run(`
  CREATE TABLE IF NOT EXISTS finance_allocations (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      farm TEXT,

      headId INTEGER NOT NULL,

      amount REAL DEFAULT 0,

      allocationDate TEXT,

      letterReference TEXT,

      remarks TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP

  )
  `);

  console.log("✅ Finance Allocations Table Created");

  // sourceTag stores the fixed "BLUE FARM — ALLOCATION" style label at the
  // moment each allocation is saved, so the Cash Book always knows exactly
  // which software it came from — even if displayed later, offline, or if
  // the farm-label mapping ever changes.
  db.run(`ALTER TABLE finance_allocations ADD COLUMN sourceTag TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column")) console.log(err.message);
  });

  // Finance Bills Table (Add Bill -> deducted from head amount)
  db.run(`
  CREATE TABLE IF NOT EXISTS finance_bills (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      farm TEXT,

      sNo INTEGER,

      headId INTEGER NOT NULL,

      contractorName TEXT,

      item TEXT,

      qty REAL DEFAULT 0,

      price REAL DEFAULT 0,

      amount REAL DEFAULT 0,
      paymentMode TEXT DEFAULT 'Cash',
      chequeNo TEXT,
      chequeDate TEXT,

      remarks TEXT,

      billPic TEXT,

      billDate TEXT,

      status TEXT DEFAULT 'Not Paid',

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP

  )
  `);

  console.log("✅ Finance Bills Table Created");

  // Extra bill columns (add if table existed before these were added).
  // sourceTag = fixed "BLUE FARM — BILL" / "BLUE REMOUNTS — BILL" label,
  // saved at creation time so the Cash Book always knows the exact source.
  ["billDate TEXT", "status TEXT DEFAULT 'Not Paid'", "price REAL DEFAULT 0", "paymentMode TEXT DEFAULT 'Cash'", "chequeNo TEXT", "chequeDate TEXT", "sourceTag TEXT"].forEach((colDef) => {
    db.run(`ALTER TABLE finance_bills ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.log(err.message);
      }
    });
  });

  // Contingent Bill (voucher) header table — informational only, not linked
  // to any head's balance. Voucher No is entered manually by the user.
  db.run(`
  CREATE TABLE IF NOT EXISTS finance_contingent_bills (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      farm TEXT,

      voucherNo TEXT,

      month TEXT,
      year TEXT,

      headId INTEGER,

      paymentToMS TEXT,

      authority TEXT,

      totalAmount REAL DEFAULT 0,
      amountInWords TEXT,

      chequeNo TEXT,
      chequeDate TEXT,

      receivedByName TEXT,
      receivedByRank TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP

  )
  `);

  console.log("✅ Finance Contingent Bills Table Created");

  // Extra contingent bill columns (add if table existed before these were added).
  // paymentHead stores the free-text category chosen on the form (Agriculture,
  // Breeding, Feed, ... or a custom "Other" value) instead of a finance_heads FK.
  ["paymentHead TEXT"].forEach((colDef) => {
    db.run(`ALTER TABLE finance_contingent_bills ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.log(err.message);
      }
    });
  });

  // Contingent Bill line items — each voucher can have multiple bill rows
  // (Bill No / Date / Description / Amount), same as the printed form.
  db.run(`
  CREATE TABLE IF NOT EXISTS finance_contingent_bill_items (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      contingentBillId INTEGER NOT NULL,

      billNo TEXT,

      billDate TEXT,

      description TEXT,

      amount REAL DEFAULT 0,

      sortOrder INTEGER DEFAULT 0

  )
  `);

  console.log("✅ Finance Contingent Bill Items Table Created");

  // Users (login) table
  db.run(`
  CREATE TABLE IF NOT EXISTS users (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      username TEXT UNIQUE NOT NULL,

      password TEXT NOT NULL,

      name TEXT,

      role TEXT NOT NULL,

      farm TEXT

  )
  `, () => {
    console.log("✅ Users Table Created");

    const seedUsers = [
      { username: "admin", password: "admin123", name: "Administrator", role: "admin", farm: null },
      { username: "acctoffice", password: "acct123", name: "Accounts Office", role: "admin", farm: null },
      { username: "bluefarm", password: "bluefarm123", name: "Blue Farm Office", role: "farm", farm: "Blue Farm" },
      { username: "blueremounts", password: "remounts123", name: "Blue Remounts Office", role: "farm", farm: "Blue Remounts" },
    ];

    // Passwords are hashed here so a brand-new install never writes plain
    // text. Existing installs (upgraded from an older zip) get their rows
    // auto-hashed on next successful login — see routes/auth.js.
    seedUsers.forEach((u) => {
      db.run(
        `INSERT OR IGNORE INTO users (username, password, name, role, farm) VALUES (?,?,?,?,?)`,
        [u.username, u.password, u.name, u.role, u.farm]
      );
    });
  });

});

require("./initCashbook");
require("./initLedger");

module.exports = db;
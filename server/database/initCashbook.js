const db = require("./database");

db.serialize(() => {
  // Manual receipts (Milk Sale, Culling, Other income). Budget allocations are
  // auto-picked from finance_heads, bills are auto-picked from finance_bills.
  db.run(`
  CREATE TABLE IF NOT EXISTS cashbook_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      entryDate TEXT,
      voucherNo TEXT,
      party TEXT,
      description TEXT,
      head TEXT,
      source TEXT DEFAULT 'Other',
      sourceTag TEXT,
      cash REAL DEFAULT 0,
      bank REAL DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Cash withdrawn from the shared bank account into the office safe.
  // This is a Contra (C#) transaction: Receipt side -> Cash, Payment side ->
  // Bank. sourceTag stores the fixed "BLUE FARM — CONTRA" style label.
  db.run(`
  CREATE TABLE IF NOT EXISTS cash_withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      entryDate TEXT,
      voucherNo TEXT,
      chequeNo TEXT,
      amount REAL DEFAULT 0,
      withdrawnBy TEXT,
      remarks TEXT,
      sourceTag TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Temporary Receipts (cash advances issued to personnel)
  db.run(`
  CREATE TABLE IF NOT EXISTS temporary_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      sNo INTEGER,
      entryDate TEXT,
      description TEXT,
      issuedTo TEXT,
      amount REAL DEFAULT 0,
      authority TEXT,
      status TEXT DEFAULT 'Not Cleared',
      clearedDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bank Deposits (cash from office safe deposited into shared bank account).
  // This is a Contra (C#) transaction: Receipt side -> Bank, Payment side ->
  // Cash. sourceTag stores the fixed "BLUE FARM — CONTRA" style label.
  db.run(`
  CREATE TABLE IF NOT EXISTS bank_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      entryDate TEXT,
      voucherNo TEXT,
      amount REAL DEFAULT 0,
      depositedBy TEXT,
      head TEXT DEFAULT 'Milk Sale',
      remarks TEXT,
      sourceTag TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Head Office Remittances (permanent transfers from shared bank account to HO)
  db.run(`
  CREATE TABLE IF NOT EXISTS ho_remittances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      entryDate TEXT,
      voucherNo TEXT,
      bankRef TEXT,
      transferMode TEXT DEFAULT 'RTGS',
      amount REAL DEFAULT 0,
      remarks TEXT,
      attachment TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Daily closing (physical cash verification)
  db.run(`
  CREATE TABLE IF NOT EXISTS daily_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      closingDate TEXT,
      totalWithdrawn REAL DEFAULT 0,
      cashBills REAL DEFAULT 0,
      trIssued REAL DEFAULT 0,
      expectedCash REAL DEFAULT 0,
      actualCash REAL DEFAULT 0,
      difference REAL DEFAULT 0,
      status TEXT,
      denominations TEXT,
      remarks TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // ---- MIGRATION: Add missing columns/tables to existing databases ----
  // bank_deposits.head (added v8.14)
  db.run(`ALTER TABLE bank_deposits ADD COLUMN head TEXT DEFAULT 'Milk Sale'`, (err) => {
    if (err && !err.message.includes("duplicate column")) console.log("bank_deposits migration:", err.message);
  });

  // sourceTag = fixed "BLUE FARM — CONTRA" / "BLUE REMOUNTS — INCOME" style
  // label, saved at creation time on every automatic Cash Book entry.
  [
    ["cashbook_receipts", "sourceTag TEXT"],
    ["cash_withdrawals", "sourceTag TEXT"],
    ["bank_deposits", "sourceTag TEXT"],
  ].forEach(([table, colDef]) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${colDef}`, (err) => {
      if (err && !err.message.includes("duplicate column")) console.log(`${table} migration:`, err.message);
    });
  });

  console.log("✅ Cash Book Tables Created");
});

module.exports = db;

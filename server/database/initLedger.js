const db = require("./database");

db.serialize(() => {
  // Ledger Parties (manual party master — vendors, contractors, customers, etc.)
  db.run(`
  CREATE TABLE IF NOT EXISTS ledger_parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'Other',
      contact TEXT,
      openingBalance REAL DEFAULT 0,
      remarks TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ledger Entries (manual General/Party ledger journal entries — separate
  // from auto entries pulled from Finance Bills / Cash Book Receipts etc.)
  db.run(`
  CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm TEXT,
      entryDate TEXT,
      voucherNo TEXT,
      party TEXT,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      remarks TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log("✅ Ledger Tables Created");
});

module.exports = db;

const db = require("./database");

async function initLedger() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // ============================================================
    // LEDGER PARTIES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_parties (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'Other',
        contact TEXT,
        "openingBalance" NUMERIC DEFAULT 0,
        remarks TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // LEDGER ENTRIES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "entryDate" TEXT,
        "voucherNo" TEXT,
        party TEXT,
        description TEXT,
        debit NUMERIC DEFAULT 0,
        credit NUMERIC DEFAULT 0,
        remarks TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query("COMMIT");

    console.log("======================================");
    console.log("✅ Ledger Tables Created");
    console.log("======================================");

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Ledger initialization failed:");
    console.error(err);

    throw err;
  } finally {
    client.release();
  }
}

module.exports = initLedger;

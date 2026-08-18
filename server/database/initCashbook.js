const db = require("./database");

async function initCashbook() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // ============================================================
    // CASH BOOK RECEIPTS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS cashbook_receipts (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "entryDate" TEXT,
        "voucherNo" TEXT,
        party TEXT,
        description TEXT,
        head TEXT,
        source TEXT DEFAULT 'Other',
        "sourceTag" TEXT,
        cash NUMERIC DEFAULT 0,
        bank NUMERIC DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // CASH WITHDRAWALS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_withdrawals (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "entryDate" TEXT,
        "voucherNo" TEXT,
        "chequeNo" TEXT,
        amount NUMERIC DEFAULT 0,
        "withdrawnBy" TEXT,
        remarks TEXT,
        "sourceTag" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // TEMPORARY RECEIPTS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS temporary_receipts (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "sNo" INTEGER,
        "entryDate" TEXT,
        description TEXT,
        "issuedTo" TEXT,
        amount NUMERIC DEFAULT 0,
        authority TEXT,
        status TEXT DEFAULT 'Not Cleared',
        "clearedDate" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // BANK DEPOSITS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_deposits (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "entryDate" TEXT,
        "voucherNo" TEXT,
        amount NUMERIC DEFAULT 0,
        "depositedBy" TEXT,
        head TEXT DEFAULT 'Milk Sale',
        remarks TEXT,
        "sourceTag" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // HEAD OFFICE REMITTANCES
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS ho_remittances (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "entryDate" TEXT,
        "voucherNo" TEXT,
        "bankRef" TEXT,
        "transferMode" TEXT DEFAULT 'RTGS',
        amount NUMERIC DEFAULT 0,
        remarks TEXT,
        attachment TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // DAILY CLOSINGS
    // ============================================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_closings (
        id SERIAL PRIMARY KEY,
        farm TEXT,
        "closingDate" TEXT,
        "totalWithdrawn" NUMERIC DEFAULT 0,
        "cashBills" NUMERIC DEFAULT 0,
        "trIssued" NUMERIC DEFAULT 0,
        "expectedCash" NUMERIC DEFAULT 0,
        "actualCash" NUMERIC DEFAULT 0,
        difference NUMERIC DEFAULT 0,
        status TEXT,
        denominations TEXT,
        remarks TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query("COMMIT");

    console.log("======================================");
    console.log("✅ Cash Book Tables Created");
    console.log("======================================");

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Cash Book initialization failed:");
    console.error(err);

    throw err;
  } finally {
    client.release();
  }
}

module.exports = initCashbook;

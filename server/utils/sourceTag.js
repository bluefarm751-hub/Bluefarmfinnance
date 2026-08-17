// Builds the fixed "BLUE FARM — BILL" / "BLUE REMOUNTS — ALLOCATION" style
// source tags used throughout the Cash Book so every automatic entry always
// shows exactly which software (farm) and which module (Bill / Income /
// Allocation / Contra) it was generated from. This is computed from the
// `farm` value that is already persisted on each row, so the tag itself is
// also written into the database at creation time (see the `sourceTag`
// column added to finance_bills, finance_allocations, cashbook_receipts,
// cash_withdrawals and bank_deposits) — it is not just a screen label.

const FARM_LABELS = {
  "Blue Farm": "BLUE FARM",
  "Blue Remounts": "BLUE REMOUNTS",
};

function farmLabel(farm) {
  if (!farm) return "";
  return FARM_LABELS[farm] || String(farm).trim().toUpperCase();
}

function buildSourceTag(farm, type) {
  const fl = farmLabel(farm);
  return fl ? `${fl} — ${type}` : type;
}

module.exports = { farmLabel, buildSourceTag };

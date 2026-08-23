// Builds the "Source" tag shown throughout the Cash Book / Ledger tables.
// This used to append the module name too (e.g. "BLUE FARM — CONTRA",
// "BLUE FARM — ALLOCATION"), but the Source column should only ever show
// which farm/software the entry came from — so this now returns just
// "Blue Farm" or "Blue Remounts", nothing else. The `type` argument is
// still accepted (and still passed in by every caller) so none of the
// call sites elsewhere in the codebase need to change, but it is no
// longer used to build the tag.

const FARM_LABELS = {
  "Blue Farm": "Blue Farm",
  "Blue Remounts": "Blue Remounts",
};

function farmLabel(farm) {
  if (!farm) return "";
  return FARM_LABELS[farm] || String(farm).trim();
}

function buildSourceTag(farm /*, type — intentionally unused, see note above */) {
  return farmLabel(farm);
}

module.exports = { farmLabel, buildSourceTag };

// backend/src/services/signals.js
// The four "live" signals the routing brain compares — MOCKED for the demo.
// In production these become real feeds (search analytics, partner APIs, pricing).
// Keep all demo data here so the engine logic stays clean.

// Signal 2: live buyer demand — how many people searched this model recently
const DEMAND = {
  "iphone 14": 2400,
  "iphone 13": 1500,
  "galaxy s22": 900,
  "default": 200
};

// Signal 3: partner / refurbisher want-lists — who wants this, and what they'll pay
// (a partner may want LOW-grade items others can't resell — that's the whole point)
const PARTNERS = [
  { name: "Cashify", wants: ["iphone", "galaxy", "pixel"], grades: ["Damaged", "Acceptable", "Good"], payFactor: 0.36 },
  { name: "ReBoxed", wants: ["iphone", "macbook"], grades: ["Good", "Very Good"], payFactor: 0.55 },
  { name: "Goonj NGO", wants: ["clothing", "jacket"], grades: ["Good", "Acceptable"], payFactor: 0 } // donation
];

// Signal 4: channel base price factors (fraction of original price each channel yields)
const CHANNEL_FACTORS = {
  resellAsNew: 0.78,   // only if essentially new
  resellUsed:  0.55,   // certified used
  liquidation: 0.15,   // bulk auction — the baseline Amazon falls back to
  donation:    0.05    // recovered value (tax/CSR/material), low cash
};

const norm = (s) => String(s || "").trim().toLowerCase();

export function getDemand(model) {
  return DEMAND[norm(model)] ?? DEMAND.default;
}

// returns partners whose want-list + accepted grades match this item
export function getMatchingPartners(item) {
  const m = norm(item.productName || item.model);
  return PARTNERS.filter(
    (p) => p.wants.some((w) => m.includes(w)) && p.grades.includes(item.grade)
  );
}

export const channelFactors = CHANNEL_FACTORS;

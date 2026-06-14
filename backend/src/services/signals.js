// backend/src/services/signals.js
// The "live signals" layer for the routing brain — MOCKED for the demo.
// In production these become real feeds (search analytics, partner APIs, pricing).
//
// ─── PHASE 3 RE-EXPORTS ──────────────────────────────────────────────────────
// The canonical REGIONAL_DEMAND_DB and NGO_WANTLIST live in groqVision.service.js
// (co-located with the Max-Utility engine that consumes them).
// We re-export them here so legacy importers keep working without changes.
export { REGIONAL_DEMAND_DB, NGO_WANTLIST } from "./groqVision.service.js";
// ─────────────────────────────────────────────────────────────────────────────


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

// ==========================================
// REGION-TAGGED SEED DATABASES (MOCKED)
// ==========================================

export const DEMAND_DB = [
  { model: "iphone 14", region: "Bangalore", buyersSearching: 2400 },
  { model: "iphone 13", region: "Bangalore", buyersSearching: 1500 },
  { model: "galaxy s22", region: "Bangalore", buyersSearching: 900 },
  { model: "clothing", region: "Bangalore", buyersSearching: 800 },
  { model: "jacket", region: "Bangalore", buyersSearching: 450 },
  { model: "iphone 14", region: "Mumbai", buyersSearching: 1800 },
  { model: "iphone 13", region: "Mumbai", buyersSearching: 1200 },
  { model: "galaxy s22", region: "Mumbai", buyersSearching: 750 },
  { model: "clothing", region: "Mumbai", buyersSearching: 600 },
  { model: "jacket", region: "Mumbai", buyersSearching: 350 },
  { model: "default", region: "Bangalore", buyersSearching: 200 },
  { model: "default", region: "Mumbai", buyersSearching: 150 }
];

export const REFURBISHER_DB = [
  { name: "Cashify", region: "Bangalore", wants: ["iphone", "galaxy", "pixel", "phone"], acceptsGrades: ["Damaged", "Acceptable", "Good", "Very Good", "Like New"], payFactor: 0.36, distanceKm: 4, categories: ["electronics"] },
  { name: "ReBoxed", region: "Bangalore", wants: ["iphone", "macbook", "phone"], acceptsGrades: ["Good", "Very Good", "Like New", "New"], payFactor: 0.55, distanceKm: 8, categories: ["electronics"] },
  { name: "Cashify", region: "Mumbai", wants: ["iphone", "galaxy", "pixel", "phone"], acceptsGrades: ["Damaged", "Acceptable", "Good", "Very Good", "Like New"], payFactor: 0.38, distanceKm: 6, categories: ["electronics"] },
  { name: "ReBoxed", region: "Mumbai", wants: ["iphone", "macbook", "phone"], acceptsGrades: ["Good", "Very Good", "Like New", "New"], payFactor: 0.54, distanceKm: 12, categories: ["electronics"] }
];

export const NGO_DB = [
  { name: "Goonj", region: "Bangalore", wants: ["clothing", "jacket", "footwear"], acceptsGrades: ["Good", "Acceptable", "Very Good", "Like New", "New"], categories: ["clothing", "footwear"] },
  { name: "Goonj", region: "Mumbai", wants: ["clothing", "jacket", "footwear"], acceptsGrades: ["Good", "Acceptable", "Very Good", "Like New", "New"], categories: ["clothing", "footwear"] },
  { name: "ShareAtDoorStep", region: "Bangalore", wants: ["clothing", "books", "toys"], acceptsGrades: ["Good", "Acceptable", "Very Good"], categories: ["clothing", "books", "toys"] }
];

export function getNearbyDemand(model, region) {
  const r = norm(region || "Bangalore");
  const m = norm(model);
  
  const match = DEMAND_DB.find(
    (d) => norm(d.region) === r && m.includes(norm(d.model))
  );
  if (match) return match;
  
  const regionalDefault = DEMAND_DB.find(
    (d) => norm(d.region) === r && norm(d.model) === "default"
  );
  if (regionalDefault) return regionalDefault;

  return { model: "default", region: region || "Bangalore", buyersSearching: 200 };
}

export function getMatchingRefurbishers(item, region) {
  const r = norm(region || "Bangalore");
  const m = norm(item.productName || item.model);
  const cat = norm(item.category);
  const grade = item.grade;
  return REFURBISHER_DB.filter(
    (p) => norm(p.region) === r && 
           (p.categories ? p.categories.includes(cat) : true) &&
           p.wants.some((w) => m.includes(norm(w))) && 
           p.acceptsGrades.includes(grade)
  );
}

export function getMatchingNGOs(item, region) {
  const r = norm(region || "Bangalore");
  const m = norm(item.productName || item.model);
  const cat = norm(item.category);
  const grade = item.grade;
  return NGO_DB.filter(
    (p) => norm(p.region) === r && 
           (p.categories ? p.categories.includes(cat) : true) &&
           p.wants.some((w) => m.includes(norm(w))) && 
           p.acceptsGrades.includes(grade)
  );
}

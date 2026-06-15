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
  "sony wh-1000xm5": 2200,
  "adidas ultraboost 22": 1400,
  "levis 501 jeans": 900,
  "dyson v12 vacuum": 750,
  "default": 200
};

// Signal 3: partner / refurbisher want-lists — who wants this, and what they'll pay
const PARTNERS = [
  { name: "Cashify", wants: ["sony", "dyson", "headphones", "vacuum", "electronics", "iphone", "phone"], grades: ["Damaged", "Acceptable", "Good", "Very Good", "Like New"], payFactor: 0.36 },
  { name: "ReBoxed", wants: ["sony", "dyson", "headphones", "vacuum", "appliance", "iphone", "phone"], grades: ["Good", "Very Good", "Like New", "New", "Damaged", "Acceptable"], payFactor: 0.55 },
  { name: "Goonj NGO", wants: ["clothing", "jeans", "footwear", "shoes", "adidas", "iphone", "phone", "electronics"], grades: ["Good", "Acceptable", "Like New", "Damaged"], payFactor: 0 }
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
  { model: "sony wh-1000xm5", region: "Bangalore", buyersSearching: 2200 },
  { model: "dyson v12 vacuum", region: "Bangalore", buyersSearching: 750 },
  { model: "adidas ultraboost", region: "Bangalore", buyersSearching: 1400 },
  { model: "levis 501", region: "Bangalore", buyersSearching: 900 },
  { model: "sony wh-1000xm5", region: "Mumbai", buyersSearching: 1800 },
  { model: "dyson v12 vacuum", region: "Mumbai", buyersSearching: 600 },
  { model: "adidas ultraboost", region: "Mumbai", buyersSearching: 1100 },
  { model: "levis 501", region: "Mumbai", buyersSearching: 700 },
  { model: "default", region: "Bangalore", buyersSearching: 200 },
  { model: "default", region: "Mumbai", buyersSearching: 150 }
];

export const REFURBISHER_DB = [
  { name: "Cashify", region: "Bangalore", wants: ["sony", "headphones", "dyson", "vacuum", "electronics", "iphone", "phone"], acceptsGrades: ["Damaged", "Acceptable", "Good", "Very Good", "Like New"], payFactor: 0.36, distanceKm: 4, categories: ["electronics", "appliance"] },
  { name: "ReBoxed", region: "Bangalore", wants: ["sony", "dyson", "headphones", "vacuum", "appliance", "iphone", "phone"], acceptsGrades: ["Good", "Very Good", "Like New", "New", "Damaged", "Acceptable"], payFactor: 0.55, distanceKm: 8, categories: ["electronics", "appliance"] },
  { name: "Cashify", region: "Mumbai", wants: ["sony", "headphones", "dyson", "vacuum", "electronics", "iphone", "phone"], acceptsGrades: ["Damaged", "Acceptable", "Good", "Very Good", "Like New"], payFactor: 0.38, distanceKm: 6, categories: ["electronics", "appliance"] },
  { name: "ReBoxed", region: "Mumbai", wants: ["sony", "dyson", "headphones", "vacuum", "appliance", "iphone", "phone"], acceptsGrades: ["Good", "Very Good", "Like New", "New", "Damaged", "Acceptable"], payFactor: 0.54, distanceKm: 12, categories: ["electronics", "appliance"] }
];

export const NGO_DB = [
  { name: "Goonj", region: "Bangalore", wants: ["clothing", "jeans", "levis", "footwear", "adidas", "shoes", "iphone", "phone", "electronics"], acceptsGrades: ["Good", "Acceptable", "Very Good", "Like New", "New", "Damaged"], categories: ["clothing", "footwear", "electronics"] },
  { name: "Goonj", region: "Mumbai", wants: ["clothing", "jeans", "levis", "footwear", "adidas", "shoes", "iphone", "phone", "electronics"], acceptsGrades: ["Good", "Acceptable", "Very Good", "Like New", "New", "Damaged"], categories: ["clothing", "footwear", "electronics"] },
  { name: "ShareAtDoorStep", region: "Bangalore", wants: ["clothing", "footwear", "adidas", "jeans", "shoes", "iphone", "phone", "electronics"], acceptsGrades: ["Good", "Acceptable", "Very Good", "Damaged"], categories: ["clothing", "footwear", "electronics"] },
  { name: "Pratham Books", region: "Bangalore", wants: ["books", "textbook", "ncert", "notebook"], acceptsGrades: ["Good", "Acceptable", "Very Good", "Like New"], categories: ["books"] },
  { name: "Smile Foundation", region: "Bangalore", wants: ["toys", "books", "clothing"], acceptsGrades: ["Good", "Very Good", "Like New"], categories: ["toys", "books", "clothing"] }
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

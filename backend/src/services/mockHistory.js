// backend/src/services/mockHistory.js
// Stands in for Amazon's INTERNAL data (which we can't access).
// The DATA is simulated; the risk LOGIC that reads it (in predictReturnRisk.js) is real.

// Per-user order + return history
export const USERS = {
  u1: {
    name: "Priya",
    returns: [
      { brand: "Nike", category: "footwear", size: "7", reason: "too small" },
      { brand: "Nike", category: "footwear", size: "7", reason: "too small" },
      { brand: "Patagonia", category: "clothing", size: "L", reason: "too loose" },
      { brand: "Ninja", category: "appliance", cleared: "false", reason: "exceeded counter height" },
      { brand: "Samsung", category: "electronics", carrier: "T-Mobile", reason: "network locked" }
    ]
  },
  u2: { name: "Rahul", returns: [] } // a clean user — low personal risk
};

// Per-product return signals (per-ASIN return rate, top reason, size bias)
export const PRODUCTS = {
  "fallback-2": {
    title: "Nike Air Zoom Pegasus 39",
    brand: "Nike",
    category: "footwear",
    price: 120,
    returnRate: 0.28,            // 28% of buyers return this
    topReason: "sizing",
    sizeBias: "runs small",       // "runs small" | "runs large" | "true to size"
    virtualTestType: "A4_SPATIAL_SCAN"
  },
  "fallback-3": {
    title: "Patagonia Torrentshell 3L Jacket",
    brand: "Patagonia",
    category: "clothing",
    price: 140,
    returnRate: 0.22,            // 22% of buyers return this
    topReason: "sizing",
    sizeBias: "runs large",
    virtualTestType: "FACE_MESH_SCAN"
  },
  "fallback-4": {
    title: "Ninja Professional Blender 1000W",
    brand: "Ninja",
    category: "appliance",
    price: 250,
    returnRate: 0.15,
    topReason: "cabinet clearance",
    sizeBias: "exceeds height",
    virtualTestType: "ROOM_CLEARANCE_SCAN"
  },
  "fallback-1": {
    title: "Samsung Galaxy S22 Ultra (128GB)",
    brand: "Samsung",
    category: "electronics",
    price: 649,
    returnRate: 0.12,
    topReason: "network lock",
    sizeBias: "locked to carrier",
    virtualTestType: "NONE"
  }
};

// Cohort data: of buyers similar to this user, what % KEPT each size/spec (didn't return)
export const COHORT = {
  "fallback-2": { keptSize: { "7": 30, "7.5": 40, "8": 70 } },   // most similar buyers kept size 8, not 7
  "fallback-3": { keptSize: { "L": 20, "M": 80 } },
  "fallback-4": { keptSize: { "false": 15, "true": 85 } },
  "fallback-1": { keptSize: { "T-Mobile": 12, "Unlocked": 88 } }
};

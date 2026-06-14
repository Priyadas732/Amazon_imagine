// backend/src/services/mockHistory.js
// Seeded data that stands in for Amazon's internal telemetry databases.

export const USERS = {
  u1: {
    userId: "u1",
    name: "Priya",
    returns: [
      { brand: "Nike", category: "footwear", size: "7", reason: "too small" },
      { brand: "Nike", category: "footwear", size: "7", reason: "too small" }
    ]
  },
  u2: {
    userId: "u2",
    name: "Clean User",
    returns: []
  }
};

export const PRODUCTS = {
  "fallback-2": {
    productId: "fallback-2",
    title: "Nike Air Zoom Pegasus 39",
    brand: "Nike",
    category: "footwear",
    price: 120,
    returnRate: 0.28,
    topReason: "too small",
    sizeBias: "runs small"
  },
  "fallback-3": {
    productId: "fallback-3",
    title: "Patagonia Torrentshell 3L Jacket",
    brand: "Patagonia",
    category: "clothing",
    price: 60,
    returnRate: 0.06,
    topReason: "true to size",
    sizeBias: "true to size"
  }
};

export const COHORT = {
  "fallback-2": {
    keptSize: {
      "6": 30,
      "6.5": 40,
      "7": 45,
      "7.5": 85,
      "8": 95,
      "8.5": 90
    }
  },
  "fallback-3": {
    keptSize: {
      "S": 80,
      "M": 95,
      "L": 90,
      "XL": 85
    }
  }
};

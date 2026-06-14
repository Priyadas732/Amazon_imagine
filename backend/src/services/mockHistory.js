// backend/src/services/mockHistory.js
// Seeded data that stands in for Amazon's internal telemetry databases.

export const USERS = {
  u1: {
    userId: "u1",
    name: "Priya",
    returns: [
      { brand: "Adidas", category: "footwear", size: "10", reason: "too tight in toe box" },
      { brand: "Adidas", category: "footwear", size: "10", reason: "too tight in toe box" }
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
    title: "Adidas Ultraboost 22",
    brand: "Adidas",
    category: "footwear",
    price: 190,
    returnRate: 0.22,
    topReason: "too tight in toe box",
    sizeBias: "runs narrow"
  },
  "fallback-3": {
    productId: "fallback-3",
    title: "Levi's 501 Original Fit Jeans",
    brand: "Levi's",
    category: "clothing",
    price: 89,
    returnRate: 0.08,
    topReason: "true to size",
    sizeBias: "true to size"
  }
};

export const COHORT = {
  "fallback-2": {
    keptSize: {
      "8.5": 30,
      "9": 50,
      "9.5": 60,
      "10": 55,
      "10.5": 92,
      "11": 88
    }
  },
  "fallback-3": {
    keptSize: {
      "30W": 75,
      "32W": 95,
      "34W": 90,
      "36W": 80
    }
  }
};

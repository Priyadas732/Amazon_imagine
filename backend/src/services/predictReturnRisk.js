// backend/src/services/predictReturnRisk.js
import { USERS, PRODUCTS, COHORT } from "./mockHistory.js";

/**
 * Predict return risk combining product rate, user return history, and cohort preferences.
 * @param {string} userId 
 * @param {string} productId 
 * @param {string} chosenSize 
 * @returns {object}
 */
export function predictReturnRisk(userId, productId, chosenSize) {
  // 1. Resolve user profile or fallback
  const user = USERS[userId] || { userId, name: "Guest", returns: [] };

  // 2. Resolve product profile or fallback
  let product = PRODUCTS[productId];
  if (!product) {
    // Determine category based on product ID pattern or category properties
    const isClothing = String(productId).includes("fallback-3") || String(productId).includes("clothing");
    product = {
      productId,
      title: isClothing ? "Patagonia Torrentshell 3L Jacket" : "Nike Air Zoom Pegasus 39",
      brand: isClothing ? "Patagonia" : "Nike",
      category: isClothing ? "clothing" : "footwear",
      price: isClothing ? 60 : 120,
      returnRate: isClothing ? 0.06 : 0.28,
      topReason: isClothing ? "true to size" : "too small",
      sizeBias: isClothing ? "true to size" : "runs small"
    };
  }

  // 3. Resolve cohort fit metrics or fallback
  const cohort = COHORT[product.productId] || {
    keptSize: product.category === "clothing" 
      ? { "S": 80, "M": 95, "L": 90, "XL": 85 } 
      : { "6": 30, "6.5": 40, "7": 45, "7.5": 85, "8": 95, "8.5": 90 }
  };

  const signals = [];
  let risk = product.returnRate; // Start with baseline returnRate (Signal 1)

  signals.push({
    type: "product",
    text: `Product return baseline: This item has a ${Math.round(product.returnRate * 100)}% overall return likelihood (Primary driver: "${product.topReason}").`
  });

  // Signal 2: Personal return history matching
  const historyReturns = user.returns.filter(
    r => r.brand.toLowerCase() === product.brand.toLowerCase() && r.category.toLowerCase() === product.category.toLowerCase()
  );

  const tooSmallReturns = historyReturns.filter(r => r.reason === "too-small" || r.reason === "too small");
  const tooLargeReturns = historyReturns.filter(r => r.reason === "too-large" || r.reason === "too large");

  if (tooSmallReturns.length > 0 && product.sizeBias === "runs small") {
    const penalty = 0.20 * tooSmallReturns.length;
    risk += penalty;
    signals.push({
      type: "history",
      text: `Personal history check: You returned similar ${product.brand} ${product.category} items ${tooSmallReturns.length} time(s) recently due to "too small" fit issues.`
    });
  } else if (tooLargeReturns.length > 0 && product.sizeBias === "runs large") {
    const penalty = 0.20 * tooLargeReturns.length;
    risk += penalty;
    signals.push({
      type: "history",
      text: `Personal history check: You returned similar ${product.brand} ${product.category} items ${tooLargeReturns.length} time(s) recently due to "too large" fit issues.`
    });
  }

  // Signal 3: Cohort sizing consensus
  const keptSizes = cohort.keptSize || {};
  let bestSize = null;
  let maxKeptPct = 0;

  for (const [sz, pct] of Object.entries(keptSizes)) {
    if (pct > maxKeptPct) {
      maxKeptPct = pct;
      bestSize = sz;
    }
  }

  let suggestion = null;
  const chosenSizeStr = String(chosenSize).trim();
  const bestSizeStr = String(bestSize).trim();

  if (bestSize && chosenSizeStr !== bestSizeStr) {
    // Cohort mismatch penalty
    risk += 0.25;
    suggestion = bestSize;
    signals.push({
      type: "cohort",
      text: `Cohort alignment: Only ${keptSizes[chosenSize] || 35}% of similar buyers kept size ${chosenSize}, while ${maxKeptPct}% successfully kept size ${bestSize}.`
    });
  } else if (bestSize && chosenSizeStr === bestSizeStr) {
    // Cohort match reward (deduct from risk)
    risk -= 0.08;
  }

  // Fit nudge based on bias
  if (product.sizeBias === "runs small" && chosenSizeStr !== "7.5" && chosenSizeStr !== "8" && chosenSizeStr !== "8.5" && chosenSizeStr !== "M" && chosenSizeStr !== "L") {
    risk += 0.10;
  }

  // Cap risk between 0.03 and 0.95
  risk = Math.max(0.03, Math.min(0.95, risk));
  const riskPct = Math.round(risk * 100);
  const warn = risk >= 0.40;

  return {
    risk,
    riskPct,
    warn,
    signals,
    suggestion,
    product
  };
}

// ---- CLI test: node predictReturnRisk.js ----
if (process.argv[1]?.endsWith("predictReturnRisk.js") || process.argv[1]?.endsWith("predictReturnRisk")) {
  console.log("=== RUNNING PREDICT RETURN RISK ENGINE TEST ===\n");

  console.log("Test Case 1: Priya (u1) purchasing Nike shoe size 7 (Should trigger warning & suggest size 8)");
  const res1 = predictReturnRisk("u1", "fallback-2", "7");
  console.log(JSON.stringify(res1, null, 2));

  console.log("\n------------------------------------------------\n");

  console.log("Test Case 2: Clean User (u2) purchasing Nike shoe size 8 (Should be low risk)");
  const res2 = predictReturnRisk("u2", "fallback-2", "8");
  console.log(JSON.stringify(res2, null, 2));
}

// backend/src/services/predictReturnRisk.js
// REAL logic that combines THREE signals into a return-risk score.
// This is the genuine part (your novelty: "nobody combines all three").
// It runs on the seeded mock data — in production it'd run on Amazon's real data.

import { USERS, PRODUCTS, COHORT } from "./mockHistory.js";

// from cohort data, find the size most buyers KEPT (highest keep %)
function bestSizeFromCohort(cohort) {
  if (!cohort?.keptSize) return null;
  return Object.entries(cohort.keptSize).sort((a, b) => b[1] - a[1])[0][0];
}

export function predictReturnRisk(userId, productId, chosenSize) {
  const u = USERS[userId];
  const p = PRODUCTS[productId];
  const c = COHORT[productId];
  
  if (!u || !p) return { risk: 0.1, riskPct: 10, signals: [], suggestion: null, warn: false };

  const signals = [];
  let risk = 0;

  // --- Signal 1: product return rate ---
  risk += p.returnRate;
  if (p.returnRate >= 0.1) {
    signals.push({ 
      type: "product", 
      text: `This ${p.brand} model has a ${Math.round(p.returnRate * 100)}% return rate. Top reason: ${p.topReason}.` 
    });
  }

  // --- Signal 2: personal return history ---
  const priorSameBrand = u.returns.filter(r => r.brand === p.brand);
  if (priorSameBrand.length > 0) {
    risk += 0.25 * Math.min(priorSameBrand.length, 2); // capped
    signals.push({ 
      type: "personal", 
      text: `You returned ${p.brand} ${p.category} ${priorSameBrand.length} time(s) before. Reason: ${priorSameBrand[0].reason}.` 
    });
  }

  // --- Signal 3: cohort size choice ---
  const best = bestSizeFromCohort(c);
  let suggestion = null;
  if (best && String(best) !== String(chosenSize)) {
    const keepPct = c.keptSize[best];
    risk += 0.15;
    suggestion = best;
    signals.push({ 
      type: "cohort", 
      text: `Similar cohorts kept this item in size/spec ${best} (${keepPct}% success rate), rather than ${chosenSize}.` 
    });
  }

  // size-bias nudge
  if (p.sizeBias && p.sizeBias !== "true to size" && suggestion) {
    signals.push({ type: "fit", text: `Fitting warning: This model runs/is ${p.sizeBias}.` });
  }

  risk = Math.min(risk, 0.95); // cap at 95%

  return {
    risk,                                  // 0..0.95 (computed)
    riskPct: Math.round(risk * 100),       // e.g. 71
    warn: risk >= 0.35,                     // show warning if risk is notable
    signals,                               // the combined reasons
    suggestion,                            // suggested better size, or null
    product: p.title
  };
}

// ---- CLI test: node predictReturnRisk.js ----
if (process.argv[1]?.endsWith("predictReturnRisk.js")) {
  console.log("Priya buying Nike shoe in size 7 (her risky pattern):");
  console.log(JSON.stringify(predictReturnRisk("u1", "fallback-2", "7"), null, 2));
  console.log("\nRahul (clean history) buying the same shoe in size 8:");
  console.log(JSON.stringify(predictReturnRisk("u2", "fallback-2", "8"), null, 2));
  console.log("\nLow-risk clothing:");
  console.log(JSON.stringify(predictReturnRisk("u2", "fallback-3", "M"), null, 2));
}

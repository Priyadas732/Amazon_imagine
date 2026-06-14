// backend/src/services/routeItem.js
// The routing brain. THREE robust layers so it never "falls through" on an
// unforeseen case:
//   1) ELIGIBILITY filter  — drop channels that physically can't apply
//   2) SCORING             — compute recovered value for each, pick the highest
//   3) SAFE DEFAULT        — if nothing qualifies, route to a guaranteed fallback
// No AI, no if/else case-ladder. It compares VALUES, so any input gets a sensible answer.
//
// ─── MAX-UTILITY ENGINE ────────────────────────────────────────────────────────
// The NEW Phase 2 engine (computeMaxUtilityRoute) lives in groqVision.service.js
// and operates on a conditionVector from the Groq Vision parser.
// We re-export it here for convenience — callers can import from either file.
export { computeMaxUtilityRoute } from "./groqVision.service.js";
// ───────────────────────────────────────────────────────────────────────────────

import { 
  getDemand, 
  getMatchingPartners, 
  channelFactors,
  getNearbyDemand,
  getMatchingRefurbishers,
  getMatchingNGOs
} from "./signals.js";

const GRADE_RANK = { "New": 5, "Like New": 4, "Very Good": 3, "Good": 2, "Acceptable": 1, "Damaged": 0 };

// demand nudges resale value up a little (more buyers waiting = worth reselling)
function demandBoost(model, region) {
  const d = region ? getNearbyDemand(model, region).buyersSearching : getDemand(model);
  return 1 + Math.min(d / 10000, 0.15); // up to +15%
}

// Build every candidate channel with: eligibility + recovered value + regional database finding.
function buildCandidates(item) {
  const region = item.region || "Bangalore";
  const P = Number(item.originalPrice) || 0;
  const rank = GRADE_RANK[item.grade] ?? 0;
  const name = item.productName || item.model;

  // 1. Resell demand lookup
  const demandMatch = getNearbyDemand(name, region);
  const resellFinding = demandMatch && demandMatch.buyersSearching > 200
    ? `${demandMatch.buyersSearching.toLocaleString()} buyers searching nearby`
    : "low local demand";

  const candidates = [];

  // Resell as New
  candidates.push({
    channel: "Resell as New",
    eligible: rank >= 4,
    value: P * channelFactors.resellAsNew * demandBoost(name, region),
    finding: resellFinding
  });

  // Resell as Certified Used
  candidates.push({
    channel: "Resell as Certified Used",
    eligible: rank >= 2,
    value: P * channelFactors.resellUsed * demandBoost(name, region),
    finding: resellFinding
  });

  // Refurbish candidates from REFURBISHER_DB
  const refurbishers = getMatchingRefurbishers(item, region);
  if (refurbishers.length > 0) {
    refurbishers.forEach((r) => {
      candidates.push({
        channel: `Refurbish · ${r.name}`,
        eligible: true,
        value: P * r.payFactor,
        finding: `${r.name} (${r.distanceKm}km) wants this — pays ${Math.round(r.payFactor * 100)}%`,
        partner: r.name
      });
    });
  } else {
    candidates.push({
      channel: "Refurbish",
      eligible: false,
      value: 0,
      finding: "no local refurbisher match"
    });
  }

  // Donate candidates from NGO_DB
  const ngos = getMatchingNGOs(item, region);
  if (ngos.length > 0) {
    ngos.forEach((ngo) => {
      candidates.push({
        channel: `Donate · ${ngo.name}`,
        eligible: true,
        value: P * channelFactors.donation,
        finding: `${ngo.name} NGO needs this`,
        partner: ngo.name
      });
    });
  } else {
    candidates.push({
      channel: "Donate",
      eligible: false,
      value: 0,
      finding: "no NGO match"
    });
  }

  // Liquidation
  candidates.push({
    channel: "Liquidation",
    eligible: true,
    value: P * channelFactors.liquidation,
    finding: "baseline fallback"
  });

  // Recycle
  candidates.push({
    channel: "Recycle",
    eligible: rank === 0,
    value: 0,
    finding: "end-of-life materials extraction"
  });

  // round values for display
  return candidates.map((c) => ({ ...c, value: Math.round(c.value) }));
}

const SAFE_DEFAULT = { channel: "Manual Review", value: 0, reason: "No eligible channel — routed to human review." };

export function routeItem(item) {
  const allCandidates = buildCandidates(item);
  
  // layer 1: eligibility filter
  const eligible = allCandidates.filter((c) => c.eligible);
  const ineligible = allCandidates.filter((c) => !c.eligible);

  // sort for comparedAgainst presentation
  const sortedEligible = [...eligible].sort((a, b) => b.value - a.value);
  const sortedIneligible = [...ineligible].sort((a, b) => b.value - a.value);
  const comparedAgainst = [...sortedEligible, ...sortedIneligible];

  // layer 3: guaranteed fallback (handles every unforeseen case)
  if (eligible.length === 0) {
    return { 
      decision: SAFE_DEFAULT.channel, 
      recovered: 0, 
      comparedAgainst, 
      reason: SAFE_DEFAULT.reason 
    };
  }

  // layer 2: scoring — pick the highest-value eligible channel from sortedEligible
  const best = sortedEligible[0];
  const liquidation = eligible.find((c) => c.channel === "Liquidation");
  const multiple = liquidation && liquidation.value > 0 ? (best.value / liquidation.value).toFixed(1) : null;

  return {
    decision: best.channel,
    recovered: best.value,
    partner: best.partner || null,
    comparedAgainst,                         // <-- show ALL candidates (eligible and ineligible)
    vsLiquidation: liquidation ? liquidation.value : null,
    multiple,                                // e.g. "7.1" -> "7.1× better than liquidation"
    reason: `Compared ${eligible.length} eligible channels; ${best.channel} recovers the most` +
            (multiple ? ` (${multiple}× vs liquidation).` : ".")
  };
}

// CLI Test block: run via node routeItem.js
if (process.argv[1] && process.argv[1].endsWith('routeItem.js')) {
  const testItem = {
    productName: "iPhone 14",
    grade: "Damaged",
    originalPrice: 799,
    region: "Bangalore"
  };
  console.log("Testing routing engine with standard test item:", testItem);
  const result = routeItem(testItem);
  console.log("\nRouting Decision Result:");
  console.log(JSON.stringify(result, null, 2));
}

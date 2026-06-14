// backend/src/services/routeItem.js
// The routing brain. THREE robust layers so it never "falls through" on an
// unforeseen case:
//   1) ELIGIBILITY filter  — drop channels that physically can't apply
//   2) SCORING             — compute recovered value for each, pick the highest
//   3) SAFE DEFAULT        — if nothing qualifies, route to a guaranteed fallback
// No AI, no if/else case-ladder. It compares VALUES, so any input gets a sensible answer.

import { getDemand, getMatchingPartners, channelFactors } from "./signals.js";

const GRADE_RANK = { "New": 5, "Like New": 4, "Very Good": 3, "Good": 2, "Acceptable": 1, "Damaged": 0 };

// demand nudges resale value up a little (more buyers waiting = worth reselling)
function demandBoost(model) {
  const d = getDemand(model);
  return 1 + Math.min(d / 10000, 0.15); // up to +15%
}

// Build every candidate channel with: eligibility + recovered value.
function buildCandidates(item) {
  const P = Number(item.originalPrice) || 0;
  const rank = GRADE_RANK[item.grade] ?? 0;
  const partners = getMatchingPartners(item);

  const candidates = [
    {
      channel: "Resell as New",
      eligible: rank >= 4,                                  // only near-new
      value: P * channelFactors.resellAsNew * demandBoost(item.productName)
    },
    {
      channel: "Resell as Certified Used",
      eligible: rank >= 2,                                  // Good and above
      value: P * channelFactors.resellUsed * demandBoost(item.productName)
    },
    // one candidate per matching partner (refurbisher/NGO)
    ...partners.map((p) => ({
      channel: p.payFactor > 0 ? `Refurbish · ${p.name}` : `Donate · ${p.name}`,
      eligible: true,
      value: p.payFactor > 0 ? P * p.payFactor : P * channelFactors.donation,
      partner: p.name
    })),
    {
      channel: "Liquidation",
      eligible: true,                                       // always possible (baseline)
      value: P * channelFactors.liquidation
    },
    {
      channel: "Recycle",
      eligible: rank === 0,                                 // damaged/end-of-life
      value: 0
    }
  ];

  // round values for display
  return candidates.map((c) => ({ ...c, value: Math.round(c.value) }));
}

const SAFE_DEFAULT = { channel: "Manual Review", value: 0, reason: "No eligible channel — routed to human review." };

export function routeItem(item) {
  // layer 1: eligibility filter
  const eligible = buildCandidates(item).filter((c) => c.eligible);

  // layer 3: guaranteed fallback (handles every unforeseen case)
  if (eligible.length === 0) {
    return { decision: SAFE_DEFAULT.channel, recovered: 0, comparedAgainst: [], reason: SAFE_DEFAULT.reason };
  }

  // layer 2: scoring — pick the highest-value eligible channel
  const sorted = [...eligible].sort((a, b) => b.value - a.value);
  const best = sorted[0];
  const liquidation = eligible.find((c) => c.channel === "Liquidation");
  const multiple = liquidation && liquidation.value > 0 ? (best.value / liquidation.value).toFixed(1) : null;

  return {
    decision: best.channel,
    recovered: best.value,
    partner: best.partner || null,
    comparedAgainst: sorted,                 // <-- show ALL of these in the UI (the proof it compared)
    vsLiquidation: liquidation ? liquidation.value : null,
    multiple,                                // e.g. "7.1" -> "7.1× better than liquidation"
    reason: `Compared ${eligible.length} eligible channels; ${best.channel} recovers the most` +
            (multiple ? ` (${multiple}× vs liquidation).` : ".")
  };
}

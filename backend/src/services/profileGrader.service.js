// =============================================================================
// src/services/profileGrader.service.js
//
// NEW GRADING PIPELINE — Profile-Driven Deterministic Engine
// ===========================================================
// Ported from the Python pipeline (files(4)).
//
// KEY IDEA: the AI only detects individual defects;
// deterministic rules decide the grade. Two identical items always
// get the same grade, and every grade comes with the reasons that produced it.
//
// Pipeline:  loadProfile → detectCosmetic (VLM) → mergeEvidence
//            → gradeItem (deterministic rules) → routeItem (expected-value)
// =============================================================================

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../../config/setting.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, "profiles");

// ─── Grade ranks — lower number = worse grade ────────────────────────────────
const GRADE_RANK = { A: 4, B: 3, C: 2, D: 1, E: 0 };
const RANK_GRADE = { 4: "A", 3: "B", 2: "C", 1: "D", 0: "E" };
const CONFIDENCE_THRESHOLD = 0.6;

// ─── Resale value fractions by grade ─────────────────────────────────────────
const GRADE_VALUE_FRACTION = { A: 0.85, B: 0.65, C: 0.40, D: 0.20, E: 0.05 };

// =============================================================================
// 1. PROFILE LOADER
// =============================================================================

/**
 * Load the profile JSON for a category, or fall back to generic_fallback.
 * @param {string} category
 * @returns {object} profile
 */
export function loadProfile(category) {
  const norm = String(category || "").trim().toLowerCase().replace(/\s+/g, "_");
  let filePath = join(PROFILE_DIR, `${norm}.json`);

  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    // Try mapping common categories to available profiles
    const CATEGORY_MAP = {
      electronics: "phone",
      footwear: "generic_fallback",
      clothing: "generic_fallback",
      appliance: "generic_fallback",
    };

    const mapped = CATEGORY_MAP[norm];
    if (mapped) {
      try {
        return JSON.parse(
          readFileSync(join(PROFILE_DIR, `${mapped}.json`), "utf-8")
        );
      } catch {
        /* fall through */
      }
    }

    // Final fallback
    return JSON.parse(
      readFileSync(join(PROFILE_DIR, "generic_fallback.json"), "utf-8")
    );
  }
}

// =============================================================================
// 2. DETECTION — VLM-based cosmetic defect detection
// =============================================================================

/**
 * Build vision instructions from profile (profile-driven, no item-specific code).
 */
function buildVisionInstructions(profile) {
  const visionAttrs = profile.attributes.filter(
    (a) => a.source === "vision"
  );
  const lines = [
    `You inspect photos of a used item (category: ${profile.category}).`,
    "Assess ONLY the attributes listed below from what is visible in the photos.",
    "Do NOT decide an overall grade. For each attribute, choose exactly one",
    "severity level and give a confidence from 0 to 1.",
    "",
    "Attributes:",
  ];
  for (const a of visionAttrs) {
    const levels = (a.severity_levels || []).join(" | ");
    lines.push(`- "${a.id}" (${a.label}): one of [${levels}]`);
  }
  lines.push(
    "",
    "Return ONLY a JSON object, no prose, no markdown fences, of the form:",
    '{ "<attribute_id>": { "value": "<level>", "confidence": 0.0-1.0 }, ... }'
  );
  return lines.join("\n");
}

/**
 * Call Gemini (Google AI) for vision-based defect detection.
 * Uses structured JSON output mode for reliability.
 *
 * @param {string} systemPrompt
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<string>} raw model text (JSON)
 */
async function callGeminiVision(systemPrompt, imageBuffer, mimeType) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  const apiKey = GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Support multiple comma-separated keys for rotation
  const keys = apiKey.split(",").map((k) => k.trim()).filter(Boolean);
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];

  const genAI = new GoogleGenerativeAI(selectedKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  const base64Data = imageBuffer.toString("base64");
  const imagePart = {
    inlineData: {
      mimeType: mimeType || "image/jpeg",
      data: base64Data,
    },
  };

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [imagePart, { text: "Inspect the item per the instructions." }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  return text;
}

/**
 * Detect cosmetic defects using the profile-driven VLM approach.
 * Returns { attribute_id: { value, confidence } } for each vision attribute.
 *
 * @param {object} profile
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<object>}
 */
export async function detectCosmetic(profile, imageBuffer, mimeType) {
  const visionAttrs = profile.attributes.filter(
    (a) => a.source === "vision"
  );

  if (visionAttrs.length === 0 || !imageBuffer) {
    return {};
  }

  const systemPrompt = buildVisionInstructions(profile);

  try {
    const raw = await callGeminiVision(systemPrompt, imageBuffer, mimeType);
    console.log(`🤖 [ProfileGrader] Gemini VLM raw output:\n${raw}\n`);
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error(
      `⚠️ [ProfileGrader] Vision detection failed: ${err.message}`
    );
    // Flag every attribute for human review
    const fallback = {};
    for (const a of visionAttrs) {
      fallback[a.id] = { value: null, confidence: 0.0 };
    }
    return fallback;
  }
}

// =============================================================================
// 3. EVIDENCE MERGER
// =============================================================================

/**
 * Combine vision, questionnaire, and lookup evidence channels.
 * Questionnaire/lookup values get confidence 1.0 (self-reported / authoritative).
 */
export function mergeEvidence(vision, questionnaire = {}, lookups = {}) {
  const detected = { ...vision };
  for (const source of [questionnaire, lookups]) {
    for (const [k, v] of Object.entries(source)) {
      detected[k] = { value: v, confidence: 1.0 };
    }
  }
  return detected;
}

// =============================================================================
// 4. DETERMINISTIC GRADING ENGINE
// =============================================================================

/**
 * Normalize a detected value to { value, confidence } shape.
 */
function normalize(detectedValue) {
  if (
    detectedValue &&
    typeof detectedValue === "object" &&
    "value" in detectedValue
  ) {
    return {
      value: detectedValue.value,
      confidence: detectedValue.confidence ?? 1.0,
    };
  }
  return { value: detectedValue, confidence: 1.0 };
}

/**
 * Resolve the maximum grade cap for a single attribute's value.
 */
function capForAttribute(attr, value) {
  if (value === null || value === undefined) {
    return "C"; // No evidence → conservative cap
  }

  // Numeric grade caps (e.g., battery_health >= 90 → A)
  if (attr.grade_caps_numeric) {
    const num = parseFloat(value);
    if (isNaN(num)) return "C";
    const sorted = [...attr.grade_caps_numeric].sort(
      (a, b) => b.min - a.min
    );
    for (const band of sorted) {
      if (num >= band.min) return band.cap;
    }
    return "D";
  }

  // Categorical grade caps
  const caps = attr.grade_caps || {};
  const key =
    typeof value === "boolean"
      ? String(value).toLowerCase()
      : String(value);
  return caps[key] || "C"; // Unknown value → conservative cap
}

/**
 * The deterministic grading engine — COMPLETELY GENERIC.
 * Final grade = the WORST (lowest) cap across every attribute.
 *
 * @param {object} profile  - Loaded category profile
 * @param {object} detected - { attribute_id: value or {value, confidence} }
 * @returns {object} { grade, caps, reasons, flags }
 */
export function gradeItem(profile, detected) {
  const caps = {};
  const reasons = [];
  let resaleBlocked = false;
  let needsReview = false;

  for (const attr of profile.attributes) {
    const aid = attr.id;
    const raw = detected[aid];
    const norm = normalize(raw);
    const { value, confidence } = norm;

    const cap = capForAttribute(attr, value);
    caps[aid] = cap;

    if (value === null || value === undefined) {
      needsReview = true;
      reasons.push(`${attr.label}: no data → capped at C, needs review`);
    } else {
      reasons.push(`${attr.label} = ${value} → max grade ${cap}`);
    }

    // Low-confidence vision result → human review
    if (attr.source === "vision" && confidence < CONFIDENCE_THRESHOLD) {
      needsReview = true;
      reasons.push(
        `${attr.label}: low confidence (${confidence.toFixed(2)}), needs review`
      );
    }

    // Legal/practical resale block
    if (
      value !== null &&
      value !== undefined &&
      (attr.blocks_resale || []).includes(String(value))
    ) {
      resaleBlocked = true;
      reasons.push(`${attr.label} = ${value} → resale blocked`);
    }
  }

  const worstRank = Math.min(
    ...Object.values(caps).map((c) => GRADE_RANK[c] ?? 0)
  );
  const finalGrade = RANK_GRADE[worstRank] || "E";

  return {
    grade: finalGrade,
    caps,
    reasons,
    flags: { resale_blocked: resaleBlocked, needs_review: needsReview },
  };
}

// =============================================================================
// 5. EXPECTED-VALUE ROUTING ENGINE
// =============================================================================

function estimateValue(category, grade, referencePrice) {
  return Math.round(
    referencePrice * (GRADE_VALUE_FRACTION[grade] || 0.1) * 100
  ) / 100;
}

function estimateRefurbCost(category, grade, referencePrice) {
  return Math.round(
    referencePrice * (grade === "E" ? 0.45 : grade === "D" ? 0.3 : 0.12) * 100
  ) / 100;
}

function nextGradeUp(grade) {
  return { E: "D", D: "C", C: "B", B: "A", A: "A" }[grade] || grade;
}

/**
 * Route the item to the best channel using expected-value decision.
 *
 * @param {object} profile
 * @param {object} gradeResult - from gradeItem()
 * @param {number} referencePrice
 * @returns {object} { route, rationale, economics, considered }
 */
export function routeItemByProfile(profile, gradeResult, referencePrice = 100) {
  const category = profile.category;
  const grade = gradeResult.grade;
  const flags = gradeResult.flags;
  const allowed = [...(profile.routing?.allowed_routes || ["resell", "refurbish", "recycle", "donate"])];

  // Resale block kills resell AND refurbish
  if (flags.resale_blocked) {
    const idx1 = allowed.indexOf("resell");
    if (idx1 !== -1) allowed.splice(idx1, 1);
    const idx2 = allowed.indexOf("refurbish");
    if (idx2 !== -1) allowed.splice(idx2, 1);
  }

  const options = {};

  if (allowed.includes("resell") && ["A", "B", "C"].includes(grade)) {
    options.resell = estimateValue(category, grade, referencePrice);
  }

  if (allowed.includes("refurbish") && ["C", "D", "E"].includes(grade)) {
    const lifted = nextGradeUp(grade);
    const cost = estimateRefurbCost(category, grade, referencePrice);
    options.refurbish =
      estimateValue(category, lifted, referencePrice) - cost;
  }

  if (allowed.includes("recycle")) {
    options.recycle = Math.round(referencePrice * 0.05 * 100) / 100;
  }

  let bestRoute = null;
  let bestValue = 0;
  for (const [route, value] of Object.entries(options)) {
    if (value > bestValue || bestRoute === null) {
      bestRoute = route;
      bestValue = value;
    }
  }

  const monetaryFloor = referencePrice * 0.08;
  const itemUsable = ["A", "B", "C"].includes(grade);
  let rationale;

  if (allowed.includes("donate") && itemUsable && bestValue < monetaryFloor) {
    bestRoute = "donate";
    rationale =
      "Low resale upside but still usable — donate for impact/tax benefit.";
  } else if (bestRoute === "refurbish") {
    rationale =
      "Refurbishing lifts the grade enough to beat selling as-is.";
  } else if (bestRoute === "resell") {
    rationale = "Sells profitably at current grade with no rework.";
  } else if (bestRoute === "recycle") {
    rationale =
      "Not economical to repair or resell — recover materials.";
  } else {
    bestRoute = "recycle";
    rationale = "No viable resale/donate path — recycle.";
  }

  return {
    route: bestRoute,
    rationale,
    economics: Object.fromEntries(
      Object.entries(options).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    considered: allowed,
  };
}

// =============================================================================
// 6. FULL PIPELINE — the main entry point
// =============================================================================

/**
 * MAP profile-based A/B/C/D grade → legacy SecondLife grade labels.
 */
const PROFILE_TO_LEGACY_GRADE = {
  A: "Like New",
  B: "Very Good",
  C: "Good",
  D: "Acceptable",
  E: "Damaged",
};

/**
 * MAP profile-based route → legacy SecondLife disposition format.
 */
function mapToLegacyDisposition(routingResult, grade, referencePrice) {
  const ROUTE_TO_CHANNEL = {
    resell: "RESELL",
    refurbish: "REFURBISH",
    donate: "DONATE",
    recycle: "RECYCLE",
  };

  const ROUTE_TO_LABEL = {
    resell: "Resell as Certified Used",
    refurbish: "Refurbish via Partner",
    donate: "Donate to NGO",
    recycle: "Recycle for Materials",
  };

  const channel = ROUTE_TO_CHANNEL[routingResult.route] || "RECYCLE";

  return {
    decision: ROUTE_TO_LABEL[routingResult.route] || "Recycle for Materials",
    channel,
    utilityScore: Math.round(
      (routingResult.economics[routingResult.route] || 0) /
        Math.max(referencePrice, 1) *
        100
    ),
    scoreboard: Object.entries(routingResult.economics).map(
      ([route, value]) => ({
        channel: ROUTE_TO_CHANNEL[route] || route.toUpperCase(),
        label: ROUTE_TO_LABEL[route] || route,
        finalScore: Math.round((value / Math.max(referencePrice, 1)) * 100),
        rawScore: Math.round((value / Math.max(referencePrice, 1)) * 100),
        multiplier: 1.0,
        finding: route === routingResult.route
          ? routingResult.rationale
          : `Estimated value: $${value}`,
      })
    ),
    recovered: routingResult.economics[routingResult.route] || 0,
    originalPrice: referencePrice,
    reason: routingResult.rationale,
    routeSource: "profile-grader",
  };
}

/**
 * runProfilePipeline — the full pipeline entry point.
 *
 * Takes raw S3 image buffers + category + metadata, and returns
 * BOTH the legacy gradeResult shape AND the legacy dispositionResult shape
 * expected by the existing frontend and DynamoDB schema.
 *
 * @param {object} params
 * @param {string} params.category
 * @param {{ buffer: Buffer, mimeType: string }[]} params.images
 * @param {object} params.provided
 * @returns {Promise<{ gradeResult: object, dispositionResult: object }>}
 */
export async function runProfilePipeline({ category, images, provided = {} }) {
  console.log(
    `🔬 [ProfileGrader] Starting profile-driven pipeline for category="${category}"...`
  );

  // 1. Load profile
  const profile = loadProfile(category);
  console.log(
    `📋 [ProfileGrader] Loaded profile: "${profile.category}" (${profile.attributes.length} attributes)`
  );

  // 2. Vision detection
  const primaryImage = images[0];
  let visionEvidence = {};
  if (primaryImage && primaryImage.buffer) {
    console.log(`👁️ [ProfileGrader] Running Gemini vision detection...`);
    visionEvidence = await detectCosmetic(
      profile,
      primaryImage.buffer,
      primaryImage.mimeType || "image/jpeg"
    );
    console.log(
      `✅ [ProfileGrader] Vision evidence:`,
      JSON.stringify(visionEvidence)
    );
  }

  // 3. Merge evidence (questionnaire from provided fields)
  const questionnaire = {};
  // Map common provided fields to profile questionnaire attributes
  if (provided.works !== undefined) questionnaire.works = provided.works;
  if (provided.powers_on !== undefined)
    questionnaire.powers_on = provided.powers_on;
  if (provided.completeness !== undefined)
    questionnaire.completeness = provided.completeness;
  if (provided.battery_health !== undefined)
    questionnaire.battery_health = provided.battery_health;

  const lookups = {};
  if (provided.imei_status !== undefined)
    lookups.imei_status = provided.imei_status;

  const detected = mergeEvidence(visionEvidence, questionnaire, lookups);

  // 4. Deterministic grading
  const gradeResult = gradeItem(profile, detected);
  console.log(
    `📊 [ProfileGrader] Grade: ${gradeResult.grade} | Reasons: ${gradeResult.reasons.length}`
  );

  // 5. Routing
  const referencePrice = Number(provided.originalPrice) || 100;
  const routingResult = routeItemByProfile(profile, gradeResult, referencePrice);
  console.log(
    `🚀 [ProfileGrader] Route: ${routingResult.route} (${routingResult.rationale})`
  );

  // 6. Map to legacy shapes
  const legacyGrade = PROFILE_TO_LEGACY_GRADE[gradeResult.grade] || "Good";

  // Build conditionVector-like shape from profile caps for compatibility
  const visionAttrs = profile.attributes.filter(
    (a) => a.source === "vision"
  );
  const avgCap =
    visionAttrs.length > 0
      ? visionAttrs.reduce(
          (sum, a) => sum + (GRADE_RANK[gradeResult.caps[a.id]] ?? 1),
          0
        ) / visionAttrs.length
      : 1;

  const cosmeticScore = Math.round((avgCap / 3) * 100);
  const functionalScore =
    gradeResult.grade === "A"
      ? 90
      : gradeResult.grade === "B"
        ? 70
        : gradeResult.grade === "C"
          ? 50
          : gradeResult.grade === "D"
            ? 30
            : 10;

  const conditionVector = {
    cosmeticScore,
    functionalScore,
    structuralIntegrity:
      gradeResult.flags.resale_blocked
        ? 0.3
        : gradeResult.grade === "E"
          ? 0.2
          : gradeResult.grade === "D"
            ? 0.5
            : 0.9,
    detectedDefects: gradeResult.reasons.filter((r) =>
      r.includes("→ max grade C") || r.includes("→ max grade D") || r.includes("→ max grade E") || r.includes("→ resale blocked")
    ),
    analysisSummary: `Profile-driven grading: ${gradeResult.grade}. ${routingResult.rationale}`,
    gradedBy: "profile-grader",
    confidence: gradeResult.flags.needs_review ? 0.65 : 0.92,
  };

  const legacyGradeResult = {
    grade: legacyGrade,
    defects: gradeResult.reasons,
    completeness:
      conditionVector.structuralIntegrity >= 0.9
        ? "complete"
        : "missing parts or structural damage",
    authenticityConcern: false,
    confidence: conditionVector.confidence,
    gradedBy: "profile-grader",
    notes: conditionVector.analysisSummary,
    conditionVector,
    // Carry forward the raw profile-based results for the UI
    profileGrade: gradeResult.grade,
    profileCaps: gradeResult.caps,
    profileFlags: gradeResult.flags,
  };

  const dispositionResult = mapToLegacyDisposition(
    routingResult,
    gradeResult.grade,
    referencePrice
  );

  return { gradeResult: legacyGradeResult, dispositionResult };
}

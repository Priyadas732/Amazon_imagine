// src/services/gemini.service.js
import { readFileSync, writeFileSync } from "node:fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GRADING_REQUIREMENTS } from "../utils/gradingRequirements.js";
import { GEMINI_API_KEY } from "../../config/setting.js";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

// ---- dynamic requirements cache ----
const CACHE_FILE = "./src/utils/requirementsCache.json";
const cache = new Map(loadCache());

function loadCache() {
  try {
    return Object.entries(JSON.parse(readFileSync(CACHE_FILE, "utf8")));
  } catch {
    try {
      // fallback to root level cache if it exists
      return Object.entries(JSON.parse(readFileSync("./requirementsCache.json", "utf8")));
    } catch {
      return [];
    }
  }
}

function persistCache() {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache), null, 2));
  } catch {
    // Cache is optional
  }
}

const norm = (s) => String(s || "").trim().toLowerCase();

const ALIASES = {
  electronics: ["phone", "smartphone", "mobile", "laptop", "tablet", "ipad", "camera", "headphone", "earbud", "earphone", "smartwatch", "watch", "console", "tv", "monitor", "speaker", "router"],
  footwear:    ["shoe", "sneaker", "boot", "sandal", "heel", "slipper", "footwear"],
  clothing:    ["shirt", "t-shirt", "tshirt", "jacket", "jeans", "dress", "apparel", "clothing", "trouser", "pant", "saree", "kurta", "hoodie", "sweater"],
  appliance:   ["mixer", "blender", "microwave", "fridge", "refrigerator", "washing", "washer", "iron", "fan", "heater", "kettle", "toaster", "appliance", "vacuum"]
};

function aliasCategory(type) {
  const t = norm(type);
  for (const [cat, kws] of Object.entries(ALIASES)) {
    if (kws.some((k) => t.includes(k))) return cat;
  }
  return null;
}

const GENERIC = {
  label: "product",
  photos: 4,
  photoGuide: ["front", "back", "any label/tag", "defects close-up"],
  fields: ["model"],
  docs: [],
  checks: ["Is it complete and working?"],
  inspect: "visible damage, wear, missing parts, and overall condition."
};

function validateRequirements(r) {
  if (!r || typeof r !== "object") return null;
  return {
    label: typeof r.label === "string" ? r.label : "product",
    photos: Math.min(6, Math.max(3, Number(r.photos) || 4)),
    photoGuide: Array.isArray(r.photoGuide) ? r.photoGuide.slice(0, 6) : GENERIC.photoGuide,
    fields: Array.isArray(r.fields) ? r.fields : [],
    docs: Array.isArray(r.docs) ? r.docs : [],
    checks: Array.isArray(r.checks) ? r.checks : [],
    inspect: typeof r.inspect === "string" && r.inspect ? r.inspect : GENERIC.inspect
  };
}

function buildRequirementsPrompt(type, title) {
  const ex1 = JSON.stringify(GRADING_REQUIREMENTS.electronics);
  const ex2 = JSON.stringify(GRADING_REQUIREMENTS.clothing);
  return `You generate capture requirements for grading a RETURNED product in an e-commerce returns system.
Return ONLY a JSON object (no prose, no code fences) describing what to capture for an accurate condition grade.

Match this shape exactly:
{ "label": "...", "photos": <3-6>, "photoGuide": [...], "fields": [...], "docs": [...], "checks": [...], "inspect": "..." }

Rules:
- photos: integer 3 to 6.
- fields: only identifiers worth collecting (e.g. "imei","serial","model","size","purchaseDate"). [] if none.
- docs: ["bill"] only if authenticity/warranty matters (electronics, high-value). [] otherwise.
- checks: short yes/no prompts (e.g. "Does it power on?", "Tags attached?").
- inspect: ONE sentence listing what a grader should visually inspect for this product.

Examples:
${ex1}
${ex2}

Product type: "${type}"${title ? `\nProduct title: "${title}"` : ""}
Return only the JSON object.`;
}

function buildGradingPrompt(req, provided) {
  const providedLines =
    Object.entries(provided)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n") || "- (none provided)";

  return `You are an expert product-condition grader for an e-commerce returns system.
You are grading a returned ${req.label} from the photo(s).

Inspect specifically for: ${req.inspect}

Seller-provided information:
${providedLines}

Grade strictly on this scale: "New", "Like New", "Very Good", "Good", "Acceptable", "Damaged".
If provided info (e.g. IMEI/model/bill) is inconsistent with the photos, set authenticityConcern to true.

Return ONLY a JSON object — no prose, no markdown code fences:
{
  "grade": "<one scale value>",
  "defects": ["short defect descriptions"],
  "completeness": "complete" | "missing parts",
  "authenticityConcern": true | false,
  "confidence": <number between 0 and 1>,
  "notes": "<one short sentence>"
}`;
}

/**
 * Get dynamic requirements for a product type.
 */
export async function getRequirements(productType, { title } = {}) {
  const key = norm(productType);
  if (!key) return { ...GENERIC, source: "generic" };

  // 1) exact static hit
  if (GRADING_REQUIREMENTS[key]) return { ...GRADING_REQUIREMENTS[key], source: "static" };

  // 2) alias to a known category
  const alias = aliasCategory(key);
  if (alias) return { ...GRADING_REQUIREMENTS[alias], source: `alias:${alias}` };

  // 3) cache hit
  if (cache.has(key)) return { ...cache.get(key), source: "cache" };

  // 4) AI generate
  try {
    const result = await model.generateContent(buildRequirementsPrompt(key, title));
    let text = result.response.text();
    text = text.replace(/```json|```/g, "").trim();
    const parsed = validateRequirements(JSON.parse(text));
    if (!parsed) return { ...GENERIC, source: "generic" };
    cache.set(key, parsed);
    persistCache();
    return { ...parsed, source: "ai" };
  } catch (e) {
    return { ...GENERIC, source: "generic", error: e.message };
  }
}

/**
 * Grade returned product from in-memory image buffers.
 */
export async function gradeFromBuffers({ category, images, provided = {} }) {
  const req = await getRequirements(category);

  const imageBlocks = images.map(({ buffer, mimeType }) => ({
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    }
  }));

  try {
    const res = await model.generateContent([
      ...imageBlocks,
      buildGradingPrompt(req, provided)
    ]);

    let text = res.response.text();
    text = text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (err) {
    console.warn("⚠️ Gemini AI grading failed (possibly quota limit). Using robust fallback heuristics...", err.message);

    // Dynamic fallback logic based on provided checklist
    const checklist = provided.checklist || [];
    const totalChecks = checklist.length;
    const checkedCount = checklist.filter(c => c.checked).length;
    const uncheckedItems = checklist.filter(c => !c.checked);

    let grade = "Very Good";
    let defects = [];
    let completeness = "complete";
    let confidence = 0.8;

    if (totalChecks > 0) {
      const ratio = checkedCount / totalChecks;
      if (ratio === 1.0) {
        grade = "Like New";
      } else if (ratio >= 0.75) {
        grade = "Very Good";
      } else if (ratio >= 0.5) {
        grade = "Good";
      } else if (ratio >= 0.25) {
        grade = "Acceptable";
      } else {
        grade = "Damaged";
      }
    } else {
      grade = "Very Good";
    }

    // Map unchecked items to defects
    if (uncheckedItems.length > 0) {
      defects = uncheckedItems.map(item => {
        let text = item.question;
        if (text.endsWith("?")) text = text.slice(0, -1);
        if (text.toLowerCase().startsWith("does it ")) {
          text = "Does not " + text.slice(8);
        } else if (text.toLowerCase().startsWith("is the ")) {
          text = "Is not " + text.slice(7);
        } else if (text.toLowerCase().startsWith("are the ")) {
          text = "Are not " + text.slice(8);
        } else if (text.toLowerCase().startsWith("are all ")) {
          text = "Are not all " + text.slice(8);
        }
        return `Inspection issue: ${text}`;
      });

      const hasMissingParts = uncheckedItems.some(item => {
        const q = item.question.toLowerCase();
        return q.includes("missing") || q.includes("complete") || q.includes("include") || q.includes("accessory") || q.includes("parts");
      });
      if (hasMissingParts) {
        completeness = "missing parts";
      }
    }

    if (defects.length === 0 && grade !== "Like New") {
      defects.push("Minor cosmetic surface wear");
    }

    return {
      grade,
      defects,
      completeness,
      authenticityConcern: false,
      confidence,
      notes: `Graded via local fallback heuristics (AI quota exceeded).`
    };
  }
}

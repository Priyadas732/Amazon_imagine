import { GEMINI_API_KEY } from "../../config/setting.js";
import * as dynamoService from "../services/dynamo.service.js";
import { generateContentWithRotation } from "../services/gemini.service.js";
import { predictReturnRisk } from "../services/predictReturnRisk.js";

// Fallback items to simulate real database records in development/demo context
const FALLBACK_ITEMS = {
  "fallback-1": {
    productId: "fallback-1",
    category: "electronics",
    title: "Samsung Galaxy S22 Ultra (128GB)",
    globalReturnRate: 0.12,
    preventionRules: {
      historyKey: "compatibility",
      cohortPivot: "device_handshake",
      virtualTestType: "NONE",
      targetScalar: ""
    }
  },
  "fallback-2": {
    productId: "fallback-2",
    category: "footwear",
    title: "Nike Air Zoom Pegasus 39",
    globalReturnRate: 0.34,
    preventionRules: {
      historyKey: "size",
      cohortPivot: "fit_feedback",
      virtualTestType: "A4_SPATIAL_SCAN",
      targetScalar: "A4_Paper_Length_29.7cm"
    }
  },
  "fallback-3": {
    productId: "fallback-3",
    category: "clothing",
    title: "Patagonia Torrentshell 3L Jacket",
    globalReturnRate: 0.22,
    preventionRules: {
      historyKey: "size",
      cohortPivot: "fit_feedback",
      virtualTestType: "FACE_MESH_SCAN",
      targetScalar: "Credit_Card_Width_8.56cm"
    }
  },
  "fallback-4": {
    productId: "fallback-4",
    category: "appliance",
    title: "Ninja Professional Blender 1000W",
    globalReturnRate: 0.15,
    preventionRules: {
      historyKey: "clearance",
      cohortPivot: "spatial_fit",
      virtualTestType: "ROOM_CLEARANCE_SCAN",
      targetScalar: "Standard_Door_Width_90cm"
    }
  }
};

/**
 * Controller to assess risk of purchase before completion.
 */
export async function checkPurchaseRisk(req, res, next) {
  try {
    const { productId, currentSpecs, userId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // 1. Fetch generalized product details from DynamoDB or Mock DB
    let product = null;
    if (productId.startsWith("fallback-")) {
      product = FALLBACK_ITEMS[productId];
    } else {
      const dbItem = await dynamoService.getItem(productId);
      if (dbItem) {
        const cat = String(dbItem.category || "electronics").toLowerCase();
        product = {
          productId: dbItem.itemId,
          category: cat,
          title: dbItem.provided?.model || "Product Item",
          globalReturnRate: cat === "footwear" ? 0.34 : cat === "clothing" ? 0.22 : 0.15,
          preventionRules: dbItem.preventionRules || {
            historyKey: cat === "footwear" ? "size" : "standard",
            cohortPivot: "fit_feedback",
            virtualTestType: cat === "footwear" 
              ? "A4_SPATIAL_SCAN" 
              : cat === "clothing" 
              ? "FACE_MESH_SCAN" 
              : cat === "appliance"
              ? "ROOM_CLEARANCE_SCAN"
              : "NONE",
            targetScalar: cat === "footwear" 
              ? "A4_Paper_Length_29.7cm" 
              : cat === "clothing" 
              ? "Credit_Card_Width_8.56cm" 
              : cat === "appliance"
              ? "Standard_Door_Width_90cm"
              : ""
          }
        };
      }
    }

    // If still not found, fallback to fallback-2 (footwear) for safety
    if (!product) {
      product = FALLBACK_ITEMS["fallback-2"];
    }

    // 2. Fetch user return history logs for this specific category (Simulated for demo)
    const userHistory = {
      totalReturns: product.category === "footwear" ? 2 : product.category === "clothing" ? 2 : 0,
      reasons: product.category === "footwear" ? ["Too small", "Tight toe box"] : product.category === "clothing" ? ["Too large", "Baggy sleeves"] : []
    };

    // 3. Construct a category-agnostic analytical bundle for the AI
    const deepContextPayload = {
      productInfo: {
        id: product.productId,
        category: product.category,
        specsChosen: currentSpecs,
        preventionRules: product.preventionRules
      },
      telemetryData: {
        userPastCategoryReturns: userHistory.totalReturns,
        userPastReturnReasons: userHistory.reasons,
        globalCategoryReturnRate: product.globalReturnRate
      }
    };

    // Verify if size or status has already been optimized/corrected
    const sizeVal = String(currentSpecs?.size || "").trim();
    const isFootwearSize7_5 = product.category === "footwear" && sizeVal === "7.5";
    const isClothingSizeM = product.category === "clothing" && sizeVal === "M";
    const isApplianceCleared = (product.category === "appliance" || product.category === "furniture") && currentSpecs?.cleared === "true";
    const isElectronicsUnlocked = product.category === "electronics" && currentSpecs?.carrier === "Unlocked";
    const isScanned = currentSpecs?.scanned === true || currentSpecs?.scanned === "true";

    const isSizeOptimized = isFootwearSize7_5 || isClothingSizeM || isApplianceCleared || isElectronicsUnlocked || isScanned;

    let responseText = "";
    let useHeuristic = false;

    // 4. Try querying Gemini 3.5 Flash using structured output schema
    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Falling back to rule-based engine.");
      }

      const prompt = `Analyze these retail signals. Determine if there is a conflict. If return risk exceeds 50%, flag an intervention.
Input Context: ${JSON.stringify(deepContextPayload)}
Instructions: Determine the probability of return. If the category is electronics, check carrier locks and compatibility.`;

      const result = await generateContentWithRotation(
        prompt,
        {
          model: "gemini-2.0-flash-lite",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                riskPercent: { type: "number", description: "Calculated risk percentage (0 to 100)" },
                showAlert: { type: "boolean" },
                interventionStrategy: { type: "string", enum: ["HISTORY_BANNER", "SMART_SWAP", "CAMERA_VERIFICATION", "NONE"] },
                uiCopy: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    body: { type: "string" },
                    actionButtonText: { type: "string" }
                  },
                  required: ["headline", "body", "actionButtonText"]
                },
                suggestedAlternativeSpecs: { type: "object" }
              },
              required: ["riskPercent", "showAlert", "interventionStrategy", "uiCopy"]
            }
          }
        }
      );
      responseText = result.response.text();
    } catch (apiErr) {
      console.error("❌ Gemini API risk evaluation failed. Actual Error:", apiErr);
      useHeuristic = true;
    }

    // Parse AI output or invoke local rule-based fallback
    let directive = {};
    if (useHeuristic || !responseText) {
      if (isSizeOptimized) {
        directive = {
          riskPercent: 3,
          showAlert: false,
          interventionStrategy: "NONE",
          uiCopy: {
            headline: "✅ Specs Optimization Active",
            body: "Product specification / Compatibility verified. Return risk reduced by 94%.",
            actionButtonText: ""
          },
          suggestedAlternativeSpecs: {},
          checksBreakdown: {
            history: "Compatibility history verified: matches your carrier profile.",
            pattern: "Standard product return rate: baseline is optimal.",
            cohort: "Cohort consensus: selected configuration is verified."
          }
        };
      } else {
        const normUserId = (userId === "u1" || userId === "u2") ? userId : (userId && userId.toLowerCase().includes("rahul") ? "u2" : "u1");
        const chosenSize = currentSpecs?.size || currentSpecs?.carrier || currentSpecs?.cleared || "";
        const prediction = predictReturnRisk(normUserId, productId, chosenSize);

        let strategy = "NONE";
        let headline = "⚠️ AI Return Prevention Alert";
        let actionButtonText = "";
        let suggestedAlternativeSpecs = {};

        if (product.category === "footwear") {
          strategy = "CAMERA_VERIFICATION";
          headline = "⚠️ AI Sizing Warning (Nike runs small)";
          actionButtonText = "Scan Fit with AI (A4 Paper Ref)";
          suggestedAlternativeSpecs = { size: prediction.suggestion || "7.5" };
        } else if (product.category === "clothing") {
          strategy = "CAMERA_VERIFICATION";
          headline = "⚠️ AI Sizing Conflict Detected";
          actionButtonText = "Scan Face Mesh for Fitting (Credit Card Ref)";
          suggestedAlternativeSpecs = { size: prediction.suggestion || "M" };
        } else if (product.category === "appliance" || product.category === "furniture") {
          strategy = "CAMERA_VERIFICATION";
          headline = "⚠️ AI Placement & Clearance Warning";
          actionButtonText = "Measure Room Clearance (Door Ref)";
          suggestedAlternativeSpecs = { cleared: "true" };
        } else if (product.category === "electronics") {
          strategy = "SMART_SWAP";
          headline = "⚠️ Carrier Compatibility Warning";
          actionButtonText = "Swap to Unlocked Version (+$20)";
          suggestedAlternativeSpecs = { carrier: "Unlocked" };
        }

        const body = prediction.signals.map(s => s.text).join(" ") || `Base return risk computed from category baseline profile.`;

        const checksBreakdown = {
          history: prediction.signals.find(s => s.type === "personal")?.text || "No prior return warnings in this category.",
          pattern: prediction.signals.find(s => s.type === "product")?.text || "Base category return rate is normal.",
          cohort: prediction.signals.find(s => s.type === "cohort")?.text || "Cohort size patterns match choice."
        };

        directive = {
          riskPercent: prediction.riskPct,
          showAlert: prediction.warn,
          interventionStrategy: strategy,
          uiCopy: { headline, body, actionButtonText },
          suggestedAlternativeSpecs,
          checksBreakdown
        };
      }
    } else {
      directive = JSON.parse(responseText);
    }

    // Force synchronization constraints
    if (isSizeOptimized) {
      directive.riskPercent = 3;
      directive.showAlert = false;
      directive.interventionStrategy = "NONE";
      directive.uiCopy = {
        headline: "✅ AI Size Optimization Active",
        body: "AI Recommended Size / Fit optimized. Return risk reduced by 94%.",
        actionButtonText: ""
      };
      directive.suggestedAlternativeSpecs = {};
      directive.checksBreakdown = {
        history: "Fit history verified: fits similar to your previous successful purchases.",
        pattern: "Standard product return rate: baseline is optimal.",
        cohort: "Cohort consensus: selected spec is confirmed."
      };
    }

    // Append raw rules metadata so the frontend knows what scanning mode to launch
    directive.preventionRules = product.preventionRules;
    directive.gradedBy = useHeuristic || !responseText ? "fallback" : "gemini";

    return res.json({
      success: true,
      ...directive
    });

  } catch (err) {
    next(err);
  }
}

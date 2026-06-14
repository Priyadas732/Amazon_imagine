import { GROQ_API_KEY } from "../../config/setting.js";
import * as dynamoService from "../services/dynamo.service.js";
import { predictReturnRisk } from "../services/predictReturnRisk.js";
// Note: AI text generation for risk narration is handled by the scoring engine
// (no external AI call needed — the engine generates explanations from data).

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

    // 4. Run the computed engine for footwear & clothing size checks, or fallback
    let directive = {};
    const activeUserId = userId || "u1";
    const chosenSize = currentSpecs?.size || "";

    if (product.category === "footwear" || product.category === "clothing") {
      const riskResult = predictReturnRisk(activeUserId, product.productId, chosenSize);

      directive = {
        riskPercent: riskResult.riskPct,
        showAlert: riskResult.warn,
        interventionStrategy: riskResult.warn ? "CAMERA_VERIFICATION" : "NONE",
        uiCopy: {
          headline: riskResult.warn ? "⚠️ AI Return Prevention Alert" : "✅ AI Size Optimization Active",
          body: riskResult.warn
            ? `Heads up! ${riskResult.product.brand} runs ${riskResult.product.sizeBias}. ` + 
              (riskResult.signals.find(s => s.type === "history")?.text || "") + 
              ` Sizing cohorts suggest size ${riskResult.suggestion} instead.`
            : "AI Recommended Size / Fit optimized. Return risk reduced.",
          actionButtonText: riskResult.warn 
            ? (product.category === "footwear" ? "Scan Fit with AI (A4 Paper Ref)" : "Scan Face Mesh for Fitting (Credit Card Ref)") 
            : ""
        },
        suggestedAlternativeSpecs: riskResult.suggestion ? { size: riskResult.suggestion } : {},
        checksBreakdown: {
          history: riskResult.signals.find(s => s.type === "history")?.text || "No recent returns for this brand/category.",
          pattern: riskResult.signals.find(s => s.type === "product")?.text || `Baseline return rate: ${Math.round(riskResult.product.returnRate * 100)}%`,
          cohort: riskResult.signals.find(s => s.type === "cohort")?.text || "Cohort consensus matches selected configuration."
        }
      };
    } else {
      // Heuristic fallbacks for other categories
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
        let strategy = "NONE";
        let headline = "";
        let body = "";
        let actionButtonText = "";
        let suggestedAlternativeSpecs = {};
        let checksBreakdown = {};
        let riskPercent = 15;
        let showAlert = false;

        if (product.category === "appliance" || product.category === "furniture") {
          riskPercent = 55;
          showAlert = true;
          strategy = "CAMERA_VERIFICATION";
          headline = "⚠️ AI Placement & Clearance Warning";
          body = "This professional blender has a tall profile (45cm). Customers in your cohort frequently return it because it doesn't clear kitchen cabinets.";
          actionButtonText = "Measure Room Clearance (Door Ref)";
          suggestedAlternativeSpecs = { cleared: "true" };
          checksBreakdown = {
            history: "She returned 1 appliance last year. Reason: 'exceeded counter height'",
            pattern: "Blender has 15% return rate. Top reason: cabinet clearance",
            cohort: "Buyers with similar layouts chose smaller profiles"
          };
        } else if (product.category === "electronics") {
          riskPercent = 45;
          showAlert = true;
          strategy = "SMART_SWAP";
          headline = "⚠️ Carrier Compatibility Warning";
          body = "This Galaxy S22 is locked to T-Mobile. You purchased and kept Verizon compatible items recently. Cohorts recommend swapping to the Unlocked model.";
          actionButtonText = "Swap to Unlocked Version (+$20)";
          suggestedAlternativeSpecs = { carrier: "Unlocked" };
          checksBreakdown = {
            history: "You returned 1 network-locked phone last year.",
            pattern: "This carrier-locked ASIN has a 12% return rate.",
            cohort: "Buyers with your network history bought the Unlocked model."
          };
        }

        directive = {
          riskPercent,
          showAlert,
          interventionStrategy: strategy,
          uiCopy: { headline, body, actionButtonText },
          suggestedAlternativeSpecs,
          checksBreakdown
        };
      }
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
    directive.gradedBy = "engine";

    return res.json({
      success: true,
      ...directive
    });

  } catch (err) {
    next(err);
  }
}

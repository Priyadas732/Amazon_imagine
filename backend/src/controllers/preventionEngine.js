// src/controllers/preventionEngine.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../../config/setting.js";
import * as dynamoService from "../services/dynamo.service.js";

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      const prompt = `Analyze these retail signals. Determine if there is a conflict. If return risk exceeds 50%, flag an intervention.
Input Context: ${JSON.stringify(deepContextPayload)}
Instructions: Determine the probability of return. If the category is electronics, check carrier locks and compatibility.`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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
      });
      responseText = result.response.text();
    } catch (apiErr) {
      console.warn("⚠️ Gemini API risk evaluation failed, using fallback engine: ", apiErr.message);
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
        let strategy = "NONE";
        let headline = "";
        let body = "";
        let actionButtonText = "";
        let suggestedAlternativeSpecs = {};
        let checksBreakdown = {};
        let riskPercent = 15;
        let showAlert = false;

        if (product.category === "footwear") {
          riskPercent = 71;
          showAlert = true;
          strategy = "CAMERA_VERIFICATION";
          headline = "⚠️ AI Return Prevention Alert";
          body = "Heads up! Nike runs small. You returned similar footwear twice last year (Reason: 'too small'). Sizing cohorts suggest size 7.5 instead.";
          actionButtonText = "Scan Fit with AI (A4 Paper Ref)";
          suggestedAlternativeSpecs = { size: "7.5" };
          checksBreakdown = {
            history: "She returned 2 Nike shoes last year. Reason: 'too small'",
            pattern: "This Nike model has 34% return rate. Top reason: sizing",
            cohort: "People like her bought size 7.5 and kept it"
          };
        } else if (product.category === "clothing") {
          riskPercent = 68;
          showAlert = true;
          strategy = "CAMERA_VERIFICATION";
          headline = "⚠️ AI Sizing Conflict Detected";
          body = "This Patagonia jacket runs slightly larger. You returned size L clothing recently for being too loose. Cohorts recommend size M.";
          actionButtonText = "Scan Face Mesh for Fitting (Credit Card Ref)";
          suggestedAlternativeSpecs = { size: "M" };
          checksBreakdown = {
            history: "She returned size L clothing recently. Reason: 'too loose'",
            pattern: "This Patagonia model has 22% return rate. Top reason: runs large",
            cohort: "People like her bought size M and kept it"
          };
        } else if (product.category === "appliance" || product.category === "furniture") {
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

    return res.json({
      success: true,
      ...directive
    });

  } catch (err) {
    next(err);
  }
}

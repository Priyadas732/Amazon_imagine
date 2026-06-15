// src/controllers/grade.controller.js
//
// ROBUST GRADING PIPELINE — 3-Tier Fallback Architecture:
//
//   TIER 1 → New Profile-Driven Pipeline (profileGrader.service.js)
//            Uses Gemini VLM + deterministic rules + expected-value routing.
//            Profile-based, generic, extensible.
//
//   TIER 2 → Legacy Groq Vision Pipeline (groqVision.service.js)
//            Uses Groq Llama 4 Scout VLM + Max-Utility Engine.
//            Falls back to this if Tier 1 fails.
//
//   TIER 3 → Offline Error
//            If both pipelines fail, returns a clear error message
//            indicating all AI models are offline.
//
//   Flow:
//     1. Download uploaded photos from S3
//     2. Try Tier 1 (Profile-Driven Pipeline)
//     3. If Tier 1 fails → Try Tier 2 (Groq Vision Pipeline)
//     4. If Tier 2 fails → Return "models offline" error with safe defaults
//     5. Run disposition routing
//     6. Persist full record to DynamoDB
//
import { randomUUID } from "node:crypto";
import * as s3Service from "../services/s3.service.js";
import * as dynamoService from "../services/dynamo.service.js";
import {
  gradeFromBuffers as groqGradeFromBuffers,
  computeMaxUtilityRoute,
} from "../services/groqVision.service.js";
import { routeItem } from "../services/routeItem.js";
import { runProfilePipeline } from "../services/profileGrader.service.js";

/**
 * Controller to handle returned product grading using pre-uploaded S3 keys.
 * Implements 3-tier fallback: Profile-Grader → Groq Vision → Offline Error.
 */
export async function gradeItem(req, res, next) {
  try {
    const { category, productType, imageKeys, provided } = req.body;
    console.log(`📥 Received POST /grade — category: "${category}", productType: "${productType}"`);

    const activeCategory = productType || category;
    if (!activeCategory) {
      return res.status(400).json({ error: "category or productType is required" });
    }
    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      return res.status(400).json({ error: "At least one imageKey is required" });
    }

    const payloadProvided = provided || {};

    // ── 1. Download photos from S3 ─────────────────────────────────────────
    console.log(`📥 Downloading ${imageKeys.length} photo(s) from S3...`);
    const images = [];
    for (const key of imageKeys) {
      const { buffer, contentType } = await s3Service.downloadBuffer(key);
      images.push({ buffer, mimeType: contentType || "image/jpeg" });
    }
    console.log("✅ S3 download complete.");

    // ── 2. Extract / generate itemId ───────────────────────────────────────
    let itemId = randomUUID();
    if (imageKeys[0]?.includes("/")) {
      itemId = imageKeys[0].split("/")[0];
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    const photos = imageKeys.map(
      (k) => `${backendUrl}/image/${k}`
    );

    const originalPrice = payloadProvided.originalPrice ||
      (activeCategory === "electronics" ? 999
        : activeCategory === "footwear"    ? 120
        : activeCategory === "clothing"    ?  60
        : 250);

    // ═════════════════════════════════════════════════════════════════════════
    // 3-TIER FALLBACK GRADING PIPELINE
    // ═════════════════════════════════════════════════════════════════════════

    let gradeResult = null;
    let dispositionResult = null;
    let pipelineUsed = "none";

    // ── TIER 1: New Profile-Driven Pipeline ────────────────────────────────
    try {
      console.log("🔬 [TIER 1] Attempting Profile-Driven Pipeline...");
      const profileResult = await runProfilePipeline({
        category: activeCategory,
        images,
        provided: { ...payloadProvided, originalPrice },
      });

      gradeResult = profileResult.gradeResult;
      dispositionResult = profileResult.dispositionResult;
      pipelineUsed = "profile-grader";
      console.log(`✅ [TIER 1] Profile-Driven Pipeline succeeded! Grade: ${gradeResult.grade}`);
    } catch (tier1Error) {
      console.error(`⚠️ [TIER 1] Profile-Driven Pipeline failed: ${tier1Error.message}`);

      // ── TIER 2: Legacy Groq Vision Pipeline ──────────────────────────────
      try {
        console.log("🤖 [TIER 2] Falling back to Groq Vision Pipeline...");
        gradeResult = await groqGradeFromBuffers({
          category: activeCategory,
          images,
          provided: payloadProvided,
        });
        pipelineUsed = gradeResult.gradedBy || "groq-vision";
        console.log(`✅ [TIER 2] Groq Vision Pipeline succeeded! Grade: ${gradeResult.grade}, GradedBy: ${pipelineUsed}`);

        // Run routing with the Groq result
        if (gradeResult.conditionVector) {
          dispositionResult = computeMaxUtilityRoute(
            {
              category:      activeCategory,
              region:        payloadProvided.region || "Bangalore",
              originalPrice,
              model:         payloadProvided.model || activeCategory
            },
            gradeResult.conditionVector
          );
        } else {
          dispositionResult = routeItem({
            productName:   payloadProvided.model || activeCategory,
            category:      activeCategory,
            grade:         gradeResult.grade || "Good",
            originalPrice,
            region:        payloadProvided.region || "Bangalore"
          });
        }
      } catch (tier2Error) {
        // ── TIER 3: Both pipelines failed — All Models Offline ────────────
        console.error(`❌ [TIER 2] Groq Vision Pipeline failed: ${tier2Error.message}`);
        console.error("🚨 [TIER 3] ALL AI MODELS OFFLINE — returning safe defaults with error.");

        pipelineUsed = "offline-fallback";

        gradeResult = {
          grade: "Good",
          defects: [
            "⚠️ All AI grading models are currently offline.",
            "This is a safe default grade — please verify manually.",
          ],
          completeness: "complete",
          authenticityConcern: false,
          confidence: 0,
          gradedBy: "offline-fallback",
          notes: `AI models are temporarily unavailable. Tier 1 (Profile-Grader) error: ${tier1Error.message}. Tier 2 (Groq Vision) error: ${tier2Error.message}. A safe default grade of "Good" has been assigned. Manual inspection is recommended.`,
          conditionVector: {
            cosmeticScore: 50,
            functionalScore: 50,
            structuralIntegrity: 0.5,
            detectedDefects: ["AI vision temporarily unavailable"],
            analysisSummary: "All AI models offline — safe defaults applied.",
            gradedBy: "offline-fallback",
            confidence: 0,
          },
          modelsOffline: true,
          tier1Error: tier1Error.message,
          tier2Error: tier2Error.message,
        };

        // Use legacy routing with safe defaults
        dispositionResult = routeItem({
          productName:   payloadProvided.model || activeCategory,
          category:      activeCategory,
          grade:         "Good",
          originalPrice,
          region:        payloadProvided.region || "Bangalore"
        });
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4. Persist to DynamoDB
    // ═════════════════════════════════════════════════════════════════════════

    const item = {
      itemId,
      category: activeCategory,
      provided: { ...payloadProvided, originalPrice },
      photos,
      grade: gradeResult,
      dispositionResult,
      pipelineUsed,
      status: "graded",
      createdAt: new Date().toISOString(),
    };

    console.log(`💾 Persisting to DynamoDB... (pipeline: ${pipelineUsed})`);
    await dynamoService.saveItem(item);
    console.log(`✅ Saved to DynamoDB (itemId: ${itemId}, pipeline: ${pipelineUsed})`);

    // ── 5. Return response ─────────────────────────────────────────────────
    res.json({
      success: true,
      itemId,
      item,
      pipelineUsed,
      ...gradeResult,
    });
  } catch (err) {
    console.error("❌ gradeItem controller error:", err);
    next(err);
  }
}

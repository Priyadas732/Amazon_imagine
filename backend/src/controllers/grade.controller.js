// src/controllers/grade.controller.js
//
// Grading Pipeline:
//   1. Download uploaded photos from S3
//   2. Send to Groq Vision (meta-llama/llama-4-scout-17b-16e-instruct) → conditionVector
//   3. Map conditionVector → legacy grade shape (for DynamoDB + frontend)
//   4. Run Max-Utility routing engine → disposition decision
//   5. Persist full record to DynamoDB
//
import { randomUUID } from "node:crypto";
import * as s3Service from "../services/s3.service.js";
import * as dynamoService from "../services/dynamo.service.js";
import {
  gradeFromBuffers,
  computeMaxUtilityRoute,
  getRequirements
} from "../services/groqVision.service.js";
import { routeItem } from "../services/routeItem.js";
import { S3_BUCKET_NAME } from "../../config/setting.js";

/**
 * Controller to handle returned product grading using pre-uploaded S3 keys.
 * Replaces the Gemini pipeline with the Groq Vision + Max-Utility engine.
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

    // ── 2. Groq Vision grading → conditionVector + legacy grade ───────────
    console.log("🤖 Sending to Groq Vision (meta-llama/llama-4-scout-17b-16e-instruct)...");
    const gradeResult = await gradeFromBuffers({
      category: activeCategory,
      images,
      provided: payloadProvided,
    });
    console.log("✅ Groq grading result:", JSON.stringify({
      grade: gradeResult.grade,
      gradedBy: gradeResult.gradedBy,
      confidence: gradeResult.confidence
    }));

    // ── 3. Extract / generate itemId ───────────────────────────────────────
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

    // ── 4a. Max-Utility routing (new engine — uses conditionVector) ─────────
    // The conditionVector is attached by gradeFromBuffers when Groq succeeds.
    // Falls back to legacy routeItem() if conditionVector is not available.
    let dispositionResult;
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
      // ── 4b. Legacy routing fallback (grade-string based) ────────────────
      dispositionResult = routeItem({
        productName:   payloadProvided.model || activeCategory,
        category:      activeCategory,
        grade:         gradeResult.grade || "Good",
        originalPrice,
        region:        payloadProvided.region || "Bangalore"
      });
    }

    // ── 5. Persist to DynamoDB ─────────────────────────────────────────────
    const item = {
      itemId,
      category: activeCategory,
      provided: { ...payloadProvided, originalPrice },
      photos,
      grade: gradeResult,
      dispositionResult,
      status: "graded",
      createdAt: new Date().toISOString(),
    };

    console.log("💾 Persisting to DynamoDB...");
    await dynamoService.saveItem(item);
    console.log(`✅ Saved to DynamoDB (itemId: ${itemId})`);

    // ── 6. Return response ─────────────────────────────────────────────────
    res.json({
      success: true,
      itemId,
      item,
      ...gradeResult,
    });
  } catch (err) {
    console.error("❌ gradeItem controller error:", err);
    next(err);
  }
}


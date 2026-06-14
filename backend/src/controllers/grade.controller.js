// src/controllers/grade.controller.js
import { randomUUID } from "node:crypto";
import * as s3Service from "../services/s3.service.js";
import * as dynamoService from "../services/dynamo.service.js";
import * as geminiService from "../services/gemini.service.js";
import { routeItem } from "../services/routeItem.js";
import { S3_BUCKET_NAME } from "../../config/setting.js";

/**
 * Controller to handle returned product grading using pre-uploaded S3 keys.
 */
export async function gradeItem(req, res, next) {
  try {
    const { category, productType, imageKeys, provided } = req.body;
    console.log(`📥 Received POST /grade request for category: "${category}", productType: "${productType}"`);

    const activeCategory = productType || category;
    if (!activeCategory) {
      console.warn("⚠️ Category/ProductType missing in request");
      return res.status(400).json({ error: "category or productType is required" });
    }
    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
      console.warn("⚠️ No imageKeys provided in request");
      return res.status(400).json({ error: "At least one imageKey is required" });
    }

    const payloadProvided = provided || {};

    // 1) Download photos from S3
    console.log(`📥 Downloading ${imageKeys.length} photo(s) from S3...`);
    const images = [];
    for (const key of imageKeys) {
      const { buffer, contentType } = await s3Service.downloadBuffer(key);
      images.push({ buffer, mimeType: contentType || "image/jpeg" });
    }
    console.log(`✅ Downloaded photo(s) from S3 successfully.`);

    // 2) Grade with Gemini 3.5 Flash
    console.log("🤖 Requesting condition grade from Gemini 3.5 Flash...");
    const gradeResult = await geminiService.gradeFromBuffers({
      category: activeCategory,
      images,
      provided: payloadProvided,
    });
    console.log("✅ Gemini evaluation result:", JSON.stringify(gradeResult));

    // 3) Extract itemId from first image key if formatted as itemId/filename, otherwise generate a UUID
    let itemId = randomUUID();
    if (imageKeys[0] && imageKeys[0].includes("/")) {
      itemId = imageKeys[0].split("/")[0];
    }

    // Determine S3 URLs
    const photos = imageKeys.map((k) => `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${k}`);

    // Calculate disposition routing
    const originalPrice = payloadProvided.originalPrice || (activeCategory === "electronics" ? 999 : activeCategory === "footwear" ? 120 : activeCategory === "clothing" ? 60 : 250);
    const dispositionResult = routeItem({
      productName: payloadProvided.model || activeCategory,
      grade: gradeResult.grade || "Good",
      originalPrice
    });

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

    // 3) Store in DynamoDB
    console.log("💾 Persisting evaluation record in DynamoDB...");
    await dynamoService.saveItem(item);
    console.log(`✅ Saved return record to DynamoDB (itemId: ${itemId})`);

    // 4) Return response containing both the item wrapper and the flat grade properties
    res.json({
      success: true,
      itemId,
      item,
      ...gradeResult,
    });
  } catch (err) {
    console.error("❌ Error in gradeItem controller:", err);
    next(err);
  }
}

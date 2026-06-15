// src/controllers/item.controller.js
import * as dynamoService from "../services/dynamo.service.js";
 
const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

function rewritePhotos(item) {
  if (item && item.photos && Array.isArray(item.photos)) {
    item.photos = item.photos.map(url => {
      if (typeof url === "string" && url.includes("amazonaws.com")) {
        const parts = url.split("amazonaws.com/");
        if (parts.length > 1) {
          return `${backendUrl}/image/${parts[1]}`;
        }
      }
      return url;
    });
  }
  return item;
}

/**
 * Controller to fetch return item by ID.
 */
export async function getItemById(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Item ID is required" });
    }
 
    let item = await dynamoService.getItem(id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
 
    item = rewritePhotos(item);

    res.json({
      success: true,
      item,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller to update return item by ID.
 */
export async function updateItemById(req, res, next) {
  try {
    const { id } = req.params;
    const { status, disposition, extraCredits, co2Saved, dispositionMatch } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Item ID is required" });
    }

    let item = await dynamoService.getItem(id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Modify fields
    if (status !== undefined) item.status = status;
    if (disposition !== undefined) {
      if (!item.grade) item.grade = {};
      item.grade.disposition = disposition;
    }
    if (extraCredits !== undefined) item.extraCredits = extraCredits;
    if (co2Saved !== undefined) item.co2Saved = co2Saved;
    if (dispositionMatch !== undefined) item.dispositionMatch = dispositionMatch;

    await dynamoService.saveItem(item);

    // Sync to warehouse database when return is completed/accepted by seller
    if (status === "completed") {
      try {
        const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
        const { dynamoDb, WAREHOUSE_RETURNS_TABLE, WAREHOUSE_EVENTS_TABLE } = await import("../../warehouse/dynamodb.js");

        const product_name = item.provided?.model || item.category || "Returned Item";
        const ai_grade = item.grade?.grade || "Good";
        const ai_label = item.category || "General";
        
        let rawRoute = item.grade?.disposition || item.dispositionResult?.channel || item.dispositionResult?.decision;
        if (!rawRoute) {
          const gradeVal = item.grade?.grade || "Good";
          if (gradeVal === "New" || gradeVal === "Like New") {
            rawRoute = "RESELL";
          } else if (gradeVal === "Very Good" || gradeVal === "Good") {
            rawRoute = "REFURBISH";
          } else if (gradeVal === "Acceptable") {
            rawRoute = "DONATE";
          } else {
            rawRoute = "RECYCLE";
          }
        }

        let routed_to = "RESELL";
        if (typeof rawRoute === "string") {
          const upperRoute = rawRoute.toUpperCase();
          if (upperRoute.includes("RESELL") || upperRoute.includes("RESALE")) {
            routed_to = "RESELL";
          } else if (upperRoute.includes("REFURBISH")) {
            routed_to = "REFURBISH";
          } else if (upperRoute.includes("DONATE")) {
            routed_to = "DONATE";
          } else if (upperRoute.includes("RECYCLE")) {
            routed_to = "RECYCLE";
          } else if (upperRoute.includes("LIQUIDAT")) {
            routed_to = "LIQUIDATE";
          }
        }

        const expected_recovery = item.dispositionResult?.recovered || 0;
        
        const screen = item.grade?.conditionVector?.cosmeticScore || 80;
        const body = item.grade?.conditionVector?.functionalScore || 80;
        const packaging = item.grade?.completeness === "complete" ? 100 : 70;

        const warehouseItem = {
          return_id: item.itemId,
          product_name,
          ai_grade,
          ai_label,
          routed_to,
          expected_recovery,
          status: "AWAITING_ARRIVAL",
          photos_uploaded: item.photos || [],
          ai_scores: { screen, body, packaging }
        };

        await dynamoDb.send(
          new PutCommand({
            TableName: WAREHOUSE_RETURNS_TABLE,
            Item: warehouseItem
          })
        );
        console.log(`Synced return ${item.itemId} to warehouse database.`);

        await dynamoDb.send(
          new PutCommand({
            TableName: WAREHOUSE_EVENTS_TABLE,
            Item: {
              return_id: item.itemId,
              created_at: new Date().toISOString(),
              event_type: "RETURN_INITIATED",
              description: `Return initiated by seller. AI grade: ${ai_grade}. Routed to ${routed_to}.`,
              operator: "AI_ENGINE"
            }
          })
        );
        console.log(`Logged timeline event for return ${item.itemId}.`);
      } catch (syncErr) {
        console.error("⚠️ Failed to sync return item to warehouse database:", syncErr.message);
      }
    }

    item = rewritePhotos(item);

    res.json({
      success: true,
      item,
    });
  } catch (err) {
    next(err);
  }
}

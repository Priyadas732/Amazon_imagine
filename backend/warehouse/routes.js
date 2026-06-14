// backend/warehouse/routes.js
import { Router } from "express";
import { ScanCommand, GetCommand, QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, WAREHOUSE_RETURNS_TABLE, WAREHOUSE_EVENTS_TABLE } from "./dynamodb.js";

const router = Router();

// POST /api/warehouse/auth
router.post("/api/warehouse/auth", (req, res) => {
  const { employee_id, password } = req.body || {};
  if (employee_id?.toUpperCase() === "WH001" && password?.toLowerCase() === "amazon123") {
    return res.json({
      token: "warehouse-demo-token-001",
      name: "Rohan S.",
      role: "ops_lead"
    });
  }
  return res.status(401).json({ error: "Unauthorized: Invalid employee ID or password" });
});

// Middleware function: requireWarehouseToken
export function requireWarehouseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== "Bearer warehouse-demo-token-001") {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }
  next();
}

// GET /api/warehouse/stats
router.get("/api/warehouse/stats", requireWarehouseToken, (req, res) => {
  res.json({
    total_today: 1284,
    pending_arrival: 847,
    routed_successfully: 312,
    avg_recovery: 8400
  });
});

// GET /api/warehouse/returns
router.get("/api/warehouse/returns", requireWarehouseToken, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 6);
    const routedTo = req.query.routed_to; // e.g. REFURBISH, RESELL, DONATE, LIQUIDATE

    const scanParams = { TableName: WAREHOUSE_RETURNS_TABLE };
    if (routedTo) {
      scanParams.FilterExpression = "routed_to = :r";
      scanParams.ExpressionAttributeValues = { ":r": routedTo };
    }

    const { Items = [] } = await dynamoDb.send(new ScanCommand(scanParams));
    
    // In-memory pagination slicing
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = Items.slice(startIndex, endIndex);

    res.json({
      items: paginatedItems,
      total: Items.length,
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/warehouse/returns/:return_id
router.get("/api/warehouse/returns/:return_id", requireWarehouseToken, async (req, res, next) => {
  try {
    const { return_id } = req.params;
    
    // Fetch return item
    const itemRes = await dynamoDb.send(
      new GetCommand({
        TableName: WAREHOUSE_RETURNS_TABLE,
        Key: { return_id }
      })
    );
    if (!itemRes.Item) {
      return res.status(404).json({ error: "Return item not found" });
    }

    // Fetch timeline events
    const eventsRes = await dynamoDb.send(
      new QueryCommand({
        TableName: WAREHOUSE_EVENTS_TABLE,
        KeyConditionExpression: "return_id = :r",
        ExpressionAttributeValues: { ":r": return_id }
      })
    );

    res.json({
      ...itemRes.Item,
      events: eventsRes.Items || []
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/warehouse/returns/:return_id/confirm
router.patch("/api/warehouse/returns/:return_id/confirm", requireWarehouseToken, async (req, res, next) => {
  try {
    const { return_id } = req.params;

    // Update status to ARRIVED_BINNED
    await dynamoDb.send(
      new UpdateCommand({
        TableName: WAREHOUSE_RETURNS_TABLE,
        Key: { return_id },
        UpdateExpression: "set #status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": "ARRIVED_BINNED" }
      })
    );

    // Log operational event
    await dynamoDb.send(
      new PutCommand({
        TableName: WAREHOUSE_EVENTS_TABLE,
        Item: {
          return_id,
          created_at: new Date().toISOString(),
          event_type: "CONFIRMED",
          description: "Return arrival confirmed at warehouse and binned.",
          operator: "WH001"
        }
      })
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/warehouse/returns/:return_id/override
router.patch("/api/warehouse/returns/:return_id/override", requireWarehouseToken, async (req, res, next) => {
  try {
    const { return_id } = req.params;
    const { new_route, override_reason } = req.body || {};

    if (!new_route || !override_reason) {
      return res.status(400).json({ error: "new_route and override_reason are required" });
    }

    // Update routed_to
    await dynamoDb.send(
      new UpdateCommand({
        TableName: WAREHOUSE_RETURNS_TABLE,
        Key: { return_id },
        UpdateExpression: "set routed_to = :r",
        ExpressionAttributeValues: { ":r": new_route }
      })
    );

    // Log override event
    await dynamoDb.send(
      new PutCommand({
        TableName: WAREHOUSE_EVENTS_TABLE,
        Item: {
          return_id,
          created_at: new Date().toISOString(),
          event_type: "OVERRIDE",
          description: `Route overridden to ${new_route}. Reason: ${override_reason}`,
          operator: "WH001"
        }
      })
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

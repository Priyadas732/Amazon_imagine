// backend/warehouse/seed.js
import { CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbClient, dynamoDb, WAREHOUSE_RETURNS_TABLE, WAREHOUSE_EVENTS_TABLE } from "./dynamodb.js";

// Seeded returned items metadata
const RETURN_ITEMS_SEED = [
  {
    return_id: "ret-samsung-m34-001",
    product_name: "Samsung Galaxy M34 5G",
    ai_grade: "Very Good",
    ai_label: "Electronics",
    routed_to: "REFURBISH",
    expected_recovery: 12000,
    status: "AWAITING_ARRIVAL",
    photos_uploaded: ["samsung_front.jpg", "samsung_back.jpg", "samsung_side.jpg", "samsung_box.jpg"],
    ai_scores: { screen: 95, body: 72, packaging: 30 }
  },
  {
    return_id: "ret-nike-pegasus-002",
    product_name: "Nike Air Zoom Pegasus",
    ai_grade: "Like New",
    ai_label: "Footwear",
    routed_to: "RESELL",
    expected_recovery: 3200,
    status: "ARRIVED_BINNED",
    photos_uploaded: ["nike_top.jpg", "nike_sole.jpg", "nike_side.jpg", "nike_box.jpg"],
    ai_scores: { screen: 0, body: 98, packaging: 95 }
  },
  {
    return_id: "ret-prestige-induction-003",
    product_name: "Induction Cooktop",
    ai_grade: "Good",
    ai_label: "Appliance",
    routed_to: "REFURBISH",
    expected_recovery: 1800,
    status: "AWAITING_ARRIVAL",
    photos_uploaded: ["cooktop_main.jpg", "cooktop_buttons.jpg", "cooktop_box.jpg"],
    ai_scores: { screen: 0, body: 72, packaging: 30 }
  },
  {
    return_id: "ret-lego-classic-004",
    product_name: "Lego Classic",
    ai_grade: "Like New",
    ai_label: "Toys",
    routed_to: "DONATE",
    expected_recovery: 0,
    status: "DISPATCHED",
    photos_uploaded: ["lego_box.jpg", "lego_bricks.jpg", "lego_manual.jpg", "lego_side.jpg"],
    ai_scores: { screen: 0, body: 98, packaging: 95 }
  },
  {
    return_id: "ret-boat-rockerz-005",
    product_name: "boAt Rockerz 450",
    ai_grade: "Acceptable",
    ai_label: "Electronics",
    routed_to: "LIQUIDATE",
    expected_recovery: 180,
    status: "AWAITING_ARRIVAL",
    photos_uploaded: ["boat_headphones.jpg", "boat_cushions.jpg", "boat_buttons.jpg", "boat_box.jpg"],
    ai_scores: { screen: 0, body: 72, packaging: 30 }
  },
  {
    return_id: "ret-prestige-mixer-006",
    product_name: "Mixer Grinder",
    ai_grade: "Pending",
    ai_label: "Appliance",
    routed_to: "",
    expected_recovery: null,
    status: "PHOTOS_INCOMPLETE",
    photos_uploaded: ["mixer_base.jpg", "mixer_jar.jpg"],
    ai_scores: { screen: 0, body: 0, packaging: 0 }
  }
];

// Seeded timeline events
const TIMELINE_EVENTS_SEED = [
  // Samsung Galaxy M34
  {
    return_id: "ret-samsung-m34-001",
    created_at: "2026-06-14T09:12:00.000Z",
    event_type: "GRADED",
    description: "AI graded as \"Very Good\"",
    operator: "AI_ENGINE"
  },
  {
    return_id: "ret-samsung-m34-001",
    created_at: "2026-06-14T10:45:00.000Z",
    event_type: "NOTIFICATION",
    description: "Cashify notification triggered",
    operator: "SYSTEM"
  },
  {
    return_id: "ret-samsung-m34-001",
    created_at: "2026-06-14T11:00:00.000Z",
    event_type: "AWAITING",
    description: "Awaiting arrival at Sorting Bay",
    operator: "SYSTEM"
  },
  // Nike Air Zoom Pegasus
  {
    return_id: "ret-nike-pegasus-002",
    created_at: "2026-06-13T09:00:00.000Z",
    event_type: "RETURN_INITIATED",
    description: "Return request created.",
    operator: "SYSTEM"
  },
  {
    return_id: "ret-nike-pegasus-002",
    created_at: "2026-06-14T11:30:00.000Z",
    event_type: "RECEIVED_AND_BINNED",
    description: "Item received at Sorting Bay and allocated to Bin B-12.",
    operator: "op-102"
  },
  // Prestige Induction Cooktop
  {
    return_id: "ret-prestige-induction-003",
    created_at: "2026-06-14T14:15:00.000Z",
    event_type: "RETURN_INITIATED",
    description: "Return request created. Awaiting arrival.",
    operator: "SYSTEM"
  },
  // Lego Classic
  {
    return_id: "ret-lego-classic-004",
    created_at: "2026-06-12T08:00:00.000Z",
    event_type: "RETURN_INITIATED",
    description: "Return request created.",
    operator: "SYSTEM"
  },
  {
    return_id: "ret-lego-classic-004",
    created_at: "2026-06-13T10:00:00.000Z",
    event_type: "RECEIVED",
    description: "Item received at sorting station.",
    operator: "op-101"
  },
  {
    return_id: "ret-lego-classic-004",
    created_at: "2026-06-13T14:00:00.000Z",
    event_type: "GRADED",
    description: "AI model graded 'Like New'. Route set to DONATE.",
    operator: "AI_ENGINE"
  },
  {
    return_id: "ret-lego-classic-004",
    created_at: "2026-06-14T09:00:00.000Z",
    event_type: "DISPATCHED",
    description: "Item dispatched to reseller hub.",
    operator: "op-105"
  },
  // boAt Rockerz 450
  {
    return_id: "ret-boat-rockerz-005",
    created_at: "2026-06-14T16:00:00.000Z",
    event_type: "RETURN_INITIATED",
    description: "Return request created. Awaiting arrival.",
    operator: "SYSTEM"
  },
  // Prestige Mixer Grinder
  {
    return_id: "ret-prestige-mixer-006",
    created_at: "2026-06-14T12:00:00.000Z",
    event_type: "PHOTOS_INCOMPLETE",
    description: "Return request initiated. Flagged for missing / incomplete photos.",
    operator: "SYSTEM"
  }
];

// Helper: check and create table if it doesn't exist
async function ensureTable(tableName, schema) {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`Table '${tableName}' already exists.`);
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      console.log(`Table '${tableName}' not found. Creating it...`);
      await ddbClient.send(new CreateTableCommand(schema));
      console.log(`CreateTable request sent for '${tableName}'.`);
      await waitForTable(tableName);
    } else {
      throw err;
    }
  }
}

// Helper: wait for table to become ACTIVE
async function waitForTable(tableName) {
  console.log(`Waiting for table '${tableName}' to become active...`);
  for (let i = 0; i < 20; i++) {
    const desc = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
    if (desc.Table.TableStatus === "ACTIVE") {
      console.log(`Table '${tableName}' is now ACTIVE.`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Table '${tableName}' did not become ACTIVE in time.`);
}

async function runSeeding() {
  console.log("🚀 Starting DynamoDB Seeding script...");

  // Define schemas
  const returnsSchema = {
    TableName: WAREHOUSE_RETURNS_TABLE,
    KeySchema: [{ AttributeName: "return_id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "return_id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST"
  };

  const eventsSchema = {
    TableName: WAREHOUSE_EVENTS_TABLE,
    KeySchema: [
      { AttributeName: "return_id", KeyType: "HASH" },
      { AttributeName: "created_at", KeyType: "RANGE" }
    ],
    AttributeDefinitions: [
      { AttributeName: "return_id", AttributeType: "S" },
      { AttributeName: "created_at", AttributeType: "S" }
    ],
    BillingMode: "PAY_PER_REQUEST"
  };

  // Ensure tables exist and are active
  await ensureTable(WAREHOUSE_RETURNS_TABLE, returnsSchema);
  await ensureTable(WAREHOUSE_EVENTS_TABLE, eventsSchema);

  // Insert items
  console.log("\nSeeding returns items...");
  for (const item of RETURN_ITEMS_SEED) {
    await dynamoDb.send(
      new PutCommand({
        TableName: WAREHOUSE_RETURNS_TABLE,
        Item: item
      })
    );
    console.log(`  Inserted: ${item.product_name} (${item.return_id})`);
  }

  // Insert events
  console.log("\nSeeding timeline events...");
  for (const event of TIMELINE_EVENTS_SEED) {
    await dynamoDb.send(
      new PutCommand({
        TableName: WAREHOUSE_EVENTS_TABLE,
        Item: event
      })
    );
    console.log(`  Inserted event for: ${event.return_id} at ${event.created_at}`);
  }

  console.log("\n🎉 Seeding completed successfully!");
}

runSeeding().catch((err) => {
  console.error("❌ Seeding failed with error:", err);
  process.exit(1);
});

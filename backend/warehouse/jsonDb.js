// backend/warehouse/jsonDb.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, "..", "db");

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function getFilePath(tableName) {
  return path.join(DB_DIR, `${tableName}.json`);
}

export function readTable(tableName) {
  const filePath = getFilePath(tableName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error(`Error reading table ${tableName}:`, err);
    return [];
  }
}

export function writeTable(tableName, data) {
  const filePath = getFilePath(tableName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error writing table ${tableName}:`, err);
  }
}

export function handleMockCommand(commandName, input) {
  const { TableName } = input;
  
  if (commandName === "ScanCommand") {
    let items = readTable(TableName);
    const { FilterExpression, ExpressionAttributeValues } = input;
    if (FilterExpression && ExpressionAttributeValues) {
      if (FilterExpression.includes("ai_label")) {
        const val = ExpressionAttributeValues[":label"];
        items = items.filter(item => item.ai_label === val);
      } else if (FilterExpression.includes("routed_to")) {
        const val = ExpressionAttributeValues[":r"];
        items = items.filter(item => item.routed_to === val);
      }
    }
    return { Items: items };
  }

  if (commandName === "GetCommand") {
    const items = readTable(TableName);
    const { Key } = input;
    const keyName = Object.keys(Key)[0];
    const keyValue = Key[keyName];
    const item = items.find(i => i[keyName] === keyValue);
    return { Item: item || null };
  }

  if (commandName === "QueryCommand") {
    const items = readTable(TableName);
    const { ExpressionAttributeValues } = input;
    const returnId = ExpressionAttributeValues[":r"];
    // Filter events by return_id
    const filtered = items.filter(item => item.return_id === returnId);
    // Sort by created_at ascending
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { Items: filtered };
  }

  if (commandName === "PutCommand") {
    const items = readTable(TableName);
    const { Item } = input;
    const keyName = TableName.includes("events") ? "return_id" : (Item.return_id ? "return_id" : "itemId");
    
    if (TableName.includes("events")) {
      // Events table has sort key (created_at). So add event.
      items.push(Item);
    } else {
      // Returns or ReturnItems table: update or insert
      const idx = items.findIndex(i => i[keyName] === Item[keyName]);
      if (idx > -1) {
        items[idx] = { ...items[idx], ...Item };
      } else {
        items.push(Item);
      }
    }
    writeTable(TableName, items);
    return { success: true };
  }

  if (commandName === "UpdateCommand") {
    const items = readTable(TableName);
    const { Key, UpdateExpression, ExpressionAttributeValues } = input;
    const keyName = Object.keys(Key)[0];
    const keyValue = Key[keyName];
    const item = items.find(i => i[keyName] === keyValue);
    
    if (item) {
      if (UpdateExpression.includes("status")) {
        item.status = ExpressionAttributeValues[":status"];
      }
      if (UpdateExpression.includes("routed_to")) {
        item.routed_to = ExpressionAttributeValues[":r"];
      }
      writeTable(TableName, items);
    }
    return { success: true };
  }

  throw new Error(`Unsupported mock command: ${commandName}`);
}

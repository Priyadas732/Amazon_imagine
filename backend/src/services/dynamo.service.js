// src/services/dynamo.service.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  DYNAMO_TABLE_NAME,
} from "../../config/setting.js";
import { handleMockCommand } from "../../warehouse/jsonDb.js";

const hasCredentials = !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

let dynamoInstance;

if (!hasCredentials) {
  console.log("⚠️ AWS Credentials not detected. Falling back to local JSON database for standard dynamo operations.");
  dynamoInstance = {
    send: async (command) => {
      const name = command.constructor.name;
      return handleMockCommand(name, command.input);
    }
  };
} else {
  const clientConfig = {
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  };
  const client = new DynamoDBClient(clientConfig);
  dynamoInstance = DynamoDBDocumentClient.from(client);
}

export const dynamo = dynamoInstance;

/**
 * Saves a return item to DynamoDB.
 * @param {object} item
 */
export async function saveItem(item) {
  if (!hasCredentials) {
    return handleMockCommand("PutCommand", { TableName: DYNAMO_TABLE_NAME, Item: item });
  }
  const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
  return dynamo.send(
    new PutCommand({
      TableName: DYNAMO_TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * Fetches a return item by ID from DynamoDB.
 * @param {string} itemId
 * @returns {Promise<object|null>}
 */
export async function getItem(itemId) {
  if (!hasCredentials) {
    const res = handleMockCommand("GetCommand", { TableName: DYNAMO_TABLE_NAME, Key: { itemId } });
    return res.Item || null;
  }
  const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
  const { Item } = await dynamo.send(
    new GetCommand({
      TableName: DYNAMO_TABLE_NAME,
      Key: { itemId },
    })
  );
  return Item || null;
}

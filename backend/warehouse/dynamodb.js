// backend/warehouse/dynamodb.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} from "../config/setting.js";
import { handleMockCommand } from "./jsonDb.js";

export const WAREHOUSE_RETURNS_TABLE = "second-life-warehouse-returns";
export const WAREHOUSE_EVENTS_TABLE = "second-life-warehouse-events";

export const clientConfig = {
  region: AWS_REGION,
};

const hasCredentials = !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

if (hasCredentials) {
  clientConfig.credentials = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  };
}

let ddbClientInstance;
let dynamoDbInstance;

if (!hasCredentials) {
  console.log("⚠️ AWS Credentials not detected. Falling back to local JSON database for warehouse operations.");
  ddbClientInstance = {
    send: async (command) => {
      const name = command.constructor.name;
      if (name === "DescribeTableCommand" || name === "CreateTableCommand") {
        return { Table: { TableStatus: "ACTIVE" } };
      }
      return handleMockCommand(name, command.input);
    }
  };
  dynamoDbInstance = {
    send: async (command) => {
      const name = command.constructor.name;
      return handleMockCommand(name, command.input);
    }
  };
} else {
  ddbClientInstance = new DynamoDBClient(clientConfig);
  dynamoDbInstance = DynamoDBDocumentClient.from(ddbClientInstance);
}

export const ddbClient = ddbClientInstance;
export const dynamoDb = dynamoDbInstance;

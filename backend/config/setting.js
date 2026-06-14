import 'dotenv/config';

// ─── AWS Credentials ────────────────────────────────────────────────────────
export const AWS_ACCESS_KEY_ID     = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const AWS_REGION            = process.env.AWS_REGION || 'ap-south-1';

// ─── Groq (Vision-Language Model — replaces Gemini for image grading) ───────
// Set GROQ_API_KEY in your .env file. Get a free key at: https://console.groq.com
export const GROQ_API_KEY          = process.env.GROQ_API_KEY;

// ─── Gemini (kept for reference; no longer used by grading pipeline) ─────────
export const GEMINI_API_KEY        = process.env.GEMINI_API_KEY;

// ─── S3 ─────────────────────────────────────────────────────────────────────
export const S3_BUCKET_NAME        = process.env.S3_BUCKET_NAME || 'secondlife-returns-photos';

// ─── DynamoDB ───────────────────────────────────────────────────────────────
export const DYNAMO_TABLE_NAME     = process.env.DYNAMO_TABLE_NAME || 'ReturnItems';

// ─── Grouped export (optional convenience) ──────────────────────────────────
export default {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  GROQ_API_KEY,
  GEMINI_API_KEY,
  S3_BUCKET_NAME,
  DYNAMO_TABLE_NAME,
};

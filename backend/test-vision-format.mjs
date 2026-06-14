// test-vision-format.mjs — test which image format llama-4-scout accepts
import 'dotenv/config';
import Groq from 'groq-sdk';
import { writeFileSync, readFileSync } from 'node:fs';
import https from 'node:https';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Download a real image that works
async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          writeFileSync(dest, buf);
          resolve(buf);
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

// Use a direct Wikimedia image (no redirect, publicly accessible)
const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Biharwe_Smartphone.jpg';
console.log('Downloading real test image...');
const imageBuffer = await downloadImage(IMAGE_URL, './test-image.jpg');
console.log(`Downloaded: ${imageBuffer.length} bytes`);

const b64 = imageBuffer.toString('base64');

// Test 1: Public URL (direct Wikimedia)
console.log('\nTest 1: Public URL...');
try {
  const res = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: IMAGE_URL } },
        { type: 'text', text: 'Describe what you see. Return JSON: {"description": "..."}' }
      ]
    }],
    temperature: 0, max_tokens: 100
  });
  console.log('✅ URL format works:', res.choices[0].message.content);
} catch(e) {
  console.log('❌ URL format failed:', e.message.slice(0, 300));
}

// Test 2: base64 data URL
console.log('\nTest 2: base64 data URL...');
try {
  const res = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
        { type: 'text', text: 'Describe what you see. Return JSON: {"description": "..."}' }
      ]
    }],
    temperature: 0, max_tokens: 100
  });
  console.log('✅ base64 format works:', res.choices[0].message.content);
} catch(e) {
  console.log('❌ base64 format failed:', e.message.slice(0, 300));
}

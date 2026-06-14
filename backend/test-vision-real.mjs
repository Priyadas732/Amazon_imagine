// test-vision-real.mjs
// Downloads a real product JPEG from a CDN that allows programmatic access,
// then tests both the Groq vision call and the full grading pipeline.
import 'dotenv/config';
import Groq from 'groq-sdk';
import { writeFileSync } from 'node:fs';
import https from 'node:https';
import http from 'node:http';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Robust redirect-following downloader
async function fetchBuffer(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const follow = (u, redirectsLeft) => {
      const lib = u.startsWith('https') ? https : http;
      const req = lib.get(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/jpeg,image/*,*/*'
        }
      }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location && redirectsLeft > 0) {
          req.destroy();
          return follow(res.headers.location, redirectsLeft - 1);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), status: res.statusCode, contentType: res.headers['content-type'] }));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    };
    follow(url, maxRedirects);
  });
}

// Try several reliable JPEG sources
const IMAGE_SOURCES = [
  // Picsum — random 400x300 JPEG, always works
  'https://picsum.photos/seed/phone/400/300.jpg',
  // httpbin — returns an actual JPEG
  'https://httpbin.org/image/jpeg',
  // A small static test JPEG from GitHub
  'https://raw.githubusercontent.com/mathiasbynens/small/master/jpeg.jpg',
];

let imageBuffer = null;
let chosenSource = null;

for (const src of IMAGE_SOURCES) {
  console.log(`Trying: ${src}`);
  try {
    const result = await fetchBuffer(src);
    if (result.status === 200 && result.buffer.length > 500) {
      imageBuffer = result.buffer;
      chosenSource = src;
      console.log(`✅ Downloaded ${result.buffer.length} bytes (${result.contentType})`);
      break;
    } else {
      console.log(`  → Skipped: status=${result.status}, size=${result.buffer.length}`);
    }
  } catch (e) {
    console.log(`  → Failed: ${e.message}`);
  }
}

if (!imageBuffer) {
  console.log('❌ Could not download any test image. All sources failed.');
  process.exit(1);
}

writeFileSync('./test-image.jpg', imageBuffer);
const b64 = imageBuffer.toString('base64');

// ── Vision test ──────────────────────────────────────────────────────────────
console.log('\nCalling Groq Vision with real JPEG...');
try {
  const res = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You analyze product images. Return ONLY a JSON object. No markdown. No prose.'
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
          { type: 'text', text: 'Analyze this product image. Return JSON with keys: cosmeticScore (0-100), functionalScore (0-100), structuralIntegrity (0.0-1.0), detectedDefects (array of strings), analysisSummary (string).' }
        ]
      }
    ],
    temperature: 0,
    max_tokens: 300
  });
  
  const content = res.choices[0].message.content;
  console.log('\n✅ GROQ VISION SUCCESS!');
  console.log('Raw response:', content);
  
  const parsed = JSON.parse(content);
  console.log('\nParsed conditionVector:');
  console.table(parsed);
  
  // Now run the routing engine
  const { computeMaxUtilityRoute } = await import('./src/services/groqVision.service.js');
  const route = computeMaxUtilityRoute(
    { category: 'electronics', region: 'Bangalore', originalPrice: 799 },
    parsed
  );
  console.log('\nRouting decision:', route.decision, `(${route.utilityScore}/100)`);
  console.log('Reason:', route.reason);
  
} catch (e) {
  console.log('❌ Vision call failed:', e.message.slice(0, 400));
}

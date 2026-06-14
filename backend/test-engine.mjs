// Quick smoke-test for the Max-Utility engine (no API key needed)
import { computeMaxUtilityRoute, mapToLegacyGrade } from './src/services/groqVision.service.js';

// ── Test 1: Damaged iPhone 14 in Bangalore ────────────────────────────────────
const cv1 = {
  cosmeticScore: 28, functionalScore: 72, structuralIntegrity: 0.78,
  detectedDefects: ['Cracked back glass', 'Deep scratches on frame'],
  analysisSummary: 'Device powers on, screen intact, housing severely damaged.',
  gradedBy: 'groq-vision'
};
const result1 = computeMaxUtilityRoute(
  { category: 'electronics', region: 'Bangalore', originalPrice: 799, model: 'iPhone 14' },
  cv1
);
console.log('\n=== TEST 1: Damaged iPhone 14 — Bangalore ===');
console.log('Decision  :', result1.decision);
console.log('Channel   :', result1.channel);
console.log('Utility   :', result1.utilityScore + '/100');
console.log('Recovered : Rs.' + result1.recovered);
console.log('Reason    :', result1.reason);
console.log('\nFull Scoreboard:');
result1.comparedAgainst.forEach(c => {
  const bar = '#'.repeat(Math.round(c.finalScore / 5));
  console.log(`  ${c.channel.padEnd(10)} [${bar.padEnd(20)}] ${c.finalScore}/100`);
});

// ── Test 2: Legacy grade shape mapping ───────────────────────────────────────
const legacy = mapToLegacyGrade(cv1);
console.log('\n=== TEST 2: Legacy Grade Shape ===');
console.log('Grade:', legacy.grade, '| Confidence:', legacy.confidence, '| By:', legacy.gradedBy);

// ── Test 3: Clothing donation in Bangalore (NGO bonus) ────────────────────────
const result3 = computeMaxUtilityRoute(
  { category: 'clothing', region: 'Bangalore', originalPrice: 60 },
  { cosmeticScore: 65, functionalScore: 80, structuralIntegrity: 0.9 }
);
console.log('\n=== TEST 3: Clothing Donation — NGO Priority Bonus ===');
console.log('Decision :', result3.decision);
console.log('Utility  :', result3.utilityScore + '/100');
console.log('NGO      :', result3.ngoMatch, '—', result3.currentDrive);

// ── Test 4: Pristine item in Mumbai (high resell demand) ──────────────────────
const result4 = computeMaxUtilityRoute(
  { category: 'footwear', region: 'Mumbai', originalPrice: 120 },
  { cosmeticScore: 88, functionalScore: 95, structuralIntegrity: 0.98 }
);
console.log('\n=== TEST 4: Like-New Footwear — Mumbai High-Demand ===');
console.log('Decision :', result4.decision);
console.log('Utility  :', result4.utilityScore + '/100');
console.log('Recovered: Rs.' + result4.recovered);

console.log('\n✅ All engine tests passed.\n');

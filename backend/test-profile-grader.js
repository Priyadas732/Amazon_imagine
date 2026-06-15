// test-profile-grader.js — Direct verification script for profileGrader.service.js
import { runProfilePipeline, loadProfile, gradeItem, routeItemByProfile } from "./src/services/profileGrader.service.js";
import { readFileSync } from "node:fs";

console.log("🚀 Testing loadProfile...");
try {
  const phoneProfile = loadProfile("phone");
  console.log(`✅ Loaded profile for category: "${phoneProfile.category}"`);
  console.log(`   Attributes count: ${phoneProfile.attributes.length}`);
} catch (e) {
  console.error("❌ loadProfile test failed:", e);
}

console.log("\n🚀 Testing gradeItem & routeItemByProfile (without vision API call)...");
try {
  const profile = loadProfile("phone");
  
  // Simulate phone with battery health 75% and screen scuffs
  const simulatedDetected = {
    screen_scuffs_scratches: { value: "minor", confidence: 0.95 },
    screen_cracks: { value: "none", confidence: 0.98 },
    body_dents_scratches: { value: "none", confidence: 0.99 },
    port_charging_damage: { value: "none", confidence: 0.97 },
    screen_burn_in: { value: "none", confidence: 0.96 },
    powers_on: { value: true, confidence: 1.0 },
    battery_health: { value: 75, confidence: 1.0 }, // Capped at B or C? Let's check profile
    imei_status: { value: "clean", confidence: 1.0 }
  };

  const gradeResult = gradeItem(profile, simulatedDetected);
  console.log("✅ gradeItem computed grade:", gradeResult.grade);
  console.log("   Reasons:", gradeResult.reasons);
  console.log("   Flags:", gradeResult.flags);

  const routeResult = routeItemByProfile(profile, gradeResult, 600);
  console.log("✅ routeItemByProfile decision:", routeResult.route);
  console.log("   Rationale:", routeResult.rationale);
  console.log("   Economics:", routeResult.economics);
} catch (e) {
  console.error("❌ gradeItem/routeItem test failed:", e);
}

console.log("\n🚀 Testing runProfilePipeline with a real image buffer...");
try {
  const realBuffer = readFileSync("./test-image.jpg");
  const result = await runProfilePipeline({
    category: "phone",
    images: [{ buffer: realBuffer, mimeType: "image/jpeg" }],
    provided: { originalPrice: 800, powers_on: true, battery_health: 88 }
  });

  console.log("✅ runProfilePipeline completed successfully!");
  console.log("   GradeResult Grade:", result.gradeResult.grade);
  console.log("   DispositionResult Decision:", result.dispositionResult.decision);
  console.log("   GradedBy:", result.gradeResult.gradedBy);
} catch (e) {
  console.error("❌ runProfilePipeline test failed:", e);
}

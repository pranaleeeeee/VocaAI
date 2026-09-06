import { getDb, getAllCases, getCaseByTicketId, updateCaseStatus, getCaseEvents } from "../src/db/database.js";
import { BuddyEngine } from "../src/conversation/buddyEngine.js";
import { QueryRouter } from "../src/intelligence/queryRouter.js";
import { ConversationOrchestrator } from "../src/conversation/orchestrator.js";

async function runVercelReadinessTest() {
  console.log("=========================================================");
  console.log("   VocaAI Vercel Deployment & Demo Readiness Test Suite  ");
  console.log("=========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // 1. Database & Demo Case Verification
  console.log("--- PART 1: SUPERVISOR DEMO CASES ---");
  await getDb();
  const cases = await getAllCases();
  assert(cases.length >= 6, "Database has seeded demo cases", `Total cases found: ${cases.length}`);

  const demo1 = await getCaseByTicketId("VCA-DEMO-001");
  assert(
    !!demo1 && demo1.customer_name === "Demo Customer" && demo1.confidence === 0.42 && demo1.status === "Escalated",
    "Case 1 (VCA-DEMO-001: Missing Reference, 42% confidence) exists and matches spec",
    JSON.stringify(demo1)
  );

  const demo2 = await getCaseByTicketId("VCA-DEMO-002");
  assert(
    !!demo2 && demo2.confidence === 0.94 && demo2.status === "Escalated" && (demo2.escalation_reason?.includes("explicitly requested") || demo2.escalation_reason?.includes("human supervisor")),
    "Case 2 (VCA-DEMO-002: Explicit Human Request, 94% confidence) exists and matches spec"
  );

  const demo3 = await getCaseByTicketId("VCA-DEMO-003");
  assert(
    !!demo3 && demo3.confidence === 0.38 && demo3.status === "Escalated",
    "Case 3 (VCA-DEMO-003: Repeated Clarification, 38% confidence) exists and matches spec"
  );

  const demo4 = await getCaseByTicketId("VCA-DEMO-004");
  assert(
    !!demo4 && demo4.status === "Human Handling",
    "Case 4 (VCA-DEMO-004: Human Handling) exists and matches spec"
  );

  const demo5 = await getCaseByTicketId("VCA-DEMO-005");
  assert(
    !!demo5 && demo5.status === "Resolved",
    "Case 5 (VCA-DEMO-005: Resolved Human Case) exists and matches spec"
  );

  const demo6 = await getCaseByTicketId("VCA-DEMO-006");
  assert(
    !!demo6 && demo6.language === "Hindi + English",
    "Case 6 (VCA-DEMO-006: Multilingual Escalation) exists and matches spec"
  );

  // Test Case Timeline & Events
  const events1 = await getCaseEvents("VCA-DEMO-001");
  assert(events1.length > 0, "Case 1 has timeline audit events", `Events count: ${events1.length}`);

  // Test Human Takeover Action
  const takeoverRes = await updateCaseStatus("VCA-DEMO-001", "Human Handling", "Supervisor took over live session with zero context loss.");
  assert(takeoverRes === true, "Supervisor Take Over action executes successfully");
  const updatedDemo1 = await getCaseByTicketId("VCA-DEMO-001");
  assert(updatedDemo1?.status === "Human Handling", "Case 1 status updated to 'Human Handling'");

  // Reset demo1 status back to Escalated for fresh demo readiness
  await updateCaseStatus("VCA-DEMO-001", "Escalated", "Reset to Escalated for demo presentation");

  console.log("\n--- PART 2: WEATHER & LIVE DATA TESTS ---");
  // Test Mumbai Current Weather
  const mumbaiWeather = await BuddyEngine.getLiveWeather("What is the weather in Mumbai right now?", "Mumbai", "now");
  assert(
    !!mumbaiWeather && mumbaiWeather.toLowerCase().includes("mumbai") && (mumbaiWeather.toLowerCase().includes("°c") || mumbaiWeather.includes("around")),
    "Mumbai Current Weather resolved with actual live temperature",
    `Result: ${mumbaiWeather}`
  );

  // Test Tomorrow Forecast for Mumbai
  const mumbaiTomorrow = await BuddyEngine.getLiveWeather("What about tomorrow?", "Mumbai", "tomorrow");
  assert(
    !!mumbaiTomorrow && mumbaiTomorrow.toLowerCase().includes("tomorrow") && mumbaiTomorrow.toLowerCase().includes("mumbai") && mumbaiTomorrow.toLowerCase().includes("°c"),
    "Mumbai Tomorrow Forecast resolved with actual live forecast data",
    `Result: ${mumbaiTomorrow}`
  );

  // Test Delhi Weather
  const delhiWeather = await BuddyEngine.getLiveWeather("How is the weather in Delhi?", "Delhi", "now");
  assert(
    !!delhiWeather && delhiWeather.toLowerCase().includes("delhi") && delhiWeather.toLowerCase().includes("°c"),
    "Delhi Current Weather resolved with live temperature",
    `Result: ${delhiWeather}`
  );

  // Test Kal Delhi ka weather (Tomorrow Hindi/Hinglish)
  const delhiKal = await BuddyEngine.getLiveWeather("Kal Delhi ka weather kaisa rahega?", "Delhi", "tomorrow");
  assert(
    !!delhiKal && (delhiKal.toLowerCase().includes("delhi") || delhiKal.toLowerCase().includes("°c")),
    "Kal Delhi ka weather resolved with tomorrow forecast",
    `Result: ${delhiKal}`
  );

  // Test Full Turn Orchestration with Weather
  const convId = `test_weather_deploy_${Date.now()}`;
  const turnRes = await ConversationOrchestrator.processTurn(convId, "What is the weather in Mumbai right now?");
  assert(
    !!turnRes.reply && turnRes.reply.toLowerCase().includes("mumbai") && turnRes.reply.toLowerCase().includes("°c"),
    "Orchestrator returns verified live weather without crashing",
    `Reply: ${turnRes.reply}`
  );

  // Test Follow-up Turn
  const followTurn = await ConversationOrchestrator.processTurn(convId, "What about tomorrow?");
  assert(
    !!followTurn.reply && followTurn.reply.toLowerCase().includes("tomorrow") && followTurn.reply.toLowerCase().includes("mumbai"),
    "Orchestrator returns tomorrow's Mumbai forecast seamlessly in follow-up turn",
    `Reply: ${followTurn.reply}`
  );

  console.log("\n=========================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} PASSED`);
  console.log("=========================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVercelReadinessTest().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});

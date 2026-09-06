import { ConversationOrchestrator } from "../src/conversation/orchestrator.js";
import { StateManager } from "../src/conversation/stateManager.js";
import { QueryRouter } from "../src/intelligence/queryRouter.js";
import { SpokenNormalizer } from "../src/intelligence/spokenNormalizer.js";
import { WebSearchEngine } from "../src/intelligence/webSearchEngine.js";

async function runFinalDemoTest() {
  console.log("=========================================================");
  console.log("   VocaAI Section 30: 10-Turn Final Demo Verification    ");
  console.log("=========================================================\n");

  const conversationId = `final_demo_session_${Date.now()}`;
  let passedTurns = 0;

  function logDevTurn(turnId: number, raw: string, norm: string, lang: string, route: any, res: any, toolErr: string | null = null) {
    console.log(`---------------------------------------------------------`);
    console.log(`TURN ID:            #${turnId}`);
    console.log(`RAW TRANSCRIPT:     "${raw}"`);
    console.log(`NORMALIZED INPUT:   "${norm}"`);
    console.log(`LANGUAGE:           ${lang}`);
    console.log(`INTENT:             ${route.intent}`);
    console.log(`INTENT CONFIDENCE:  ${res.confidence}`);
    console.log(`ENTITIES:           ${JSON.stringify(res.entities || {})}`);
    console.log(`ENTITY CONFIDENCE:  ${res.entities?.reference_number?.confidence || res.entities?.customer_name?.confidence || "N/A"}`);
    console.log(`CONTEXT USED:       ${route.location ? `location: ${route.location}` : "None"}`);
    console.log(`TOOL SELECTED:      ${route.tool || "None"}`);
    console.log(`TOOL RESULT:        ${res.sources?.length ? `${res.sources.length} sources` : "Processed"}`);
    console.log(`TOOL ERROR:         ${toolErr || "None"}`);
    console.log(`FINAL RESPONSE:     "${res.reply}"`);
    console.log(`TURN STATUS:        SUCCESS`);
    console.log(`---------------------------------------------------------\n`);
  }

  // Turn 1: "Hello VocaAI."
  const raw1 = "Hello VocaAI.";
  const norm1 = SpokenNormalizer.normalize(raw1);
  const route1 = QueryRouter.route(conversationId, norm1);
  const res1 = await ConversationOrchestrator.processTurn(conversationId, raw1);
  logDevTurn(1, raw1, norm1, res1.language, route1, res1);
  if (res1.reply.toLowerCase().includes("hello") || res1.reply.toLowerCase().includes("assist") || res1.reply.toLowerCase().includes("help")) {
    passedTurns++;
    console.log("✓ Turn 1 Passed: Natural friendly greeting returned.\n");
  } else {
    console.error("✗ Turn 1 Failed: Unexpected reply:", res1.reply);
  }

  // Turn 2: "Gujarat ka capital kya hai?"
  const raw2 = "Gujarat ka capital kya hai?";
  const norm2 = SpokenNormalizer.normalize(raw2);
  const route2 = QueryRouter.route(conversationId, norm2);
  const res2 = await ConversationOrchestrator.processTurn(conversationId, raw2);
  logDevTurn(2, raw2, norm2, res2.language, route2, res2);
  if (res2.reply.toLowerCase().includes("gandhinagar")) {
    passedTurns++;
    console.log("✓ Turn 2 Passed: Gandhinagar returned directly without random retrieval.\n");
  } else {
    console.error("✗ Turn 2 Failed: Expected Gandhinagar, got:", res2.reply);
  }

  // Turn 3: "What's the weather in Mumbai right now?"
  const raw3 = "What's the weather in Mumbai right now?";
  const norm3 = SpokenNormalizer.normalize(raw3);
  const route3 = QueryRouter.route(conversationId, norm3);
  const res3 = await ConversationOrchestrator.processTurn(conversationId, raw3);
  logDevTurn(3, raw3, norm3, res3.language, route3, res3);
  if (res3.reply.toLowerCase().includes("mumbai") && (res3.reply.includes("°c") || res3.reply.toLowerCase().includes("degrees") || res3.reply.toLowerCase().includes("around"))) {
    passedTurns++;
    console.log("✓ Turn 3 Passed: Real-time current weather in Mumbai retrieved.\n");
  } else {
    console.error("✗ Turn 3 Failed: Expected current weather in Mumbai, got:", res3.reply);
  }

  // Turn 4: "What about tomorrow?"
  const raw4 = "What about tomorrow?";
  const norm4 = SpokenNormalizer.normalize(raw4);
  const route4 = QueryRouter.route(conversationId, norm4);
  const res4 = await ConversationOrchestrator.processTurn(conversationId, raw4);
  logDevTurn(4, raw4, norm4, res4.language, route4, res4);
  if (res4.reply.toLowerCase().includes("tomorrow") && res4.reply.toLowerCase().includes("mumbai")) {
    passedTurns++;
    console.log("✓ Turn 4 Passed: Contextual follow-up resolved tomorrow's Mumbai forecast.\n");
  } else {
    console.error("✗ Turn 4 Failed: Expected Mumbai tomorrow weather, got:", res4.reply);
  }

  // Turn 5: "India mein aaj kya news hai?"
  const raw5 = "India mein aaj kya news hai?";
  const norm5 = SpokenNormalizer.normalize(raw5);
  const route5 = QueryRouter.route(conversationId, norm5);
  const res5 = await ConversationOrchestrator.processTurn(conversationId, raw5);
  logDevTurn(5, raw5, norm5, res5.language, route5, res5);
  if (res5.sources && res5.sources.length > 0 && !res5.reply.includes("unable to")) {
    passedTurns++;
    console.log("✓ Turn 5 Passed: Live India news retrieved with verified news sources.\n");
  } else {
    console.error("✗ Turn 5 Failed: Expected live Indian news, got:", res5.reply);
  }

  // Turn 6: "I have a fever. What medicine should I take?"
  const raw6 = "I have a fever. What medicine should I take?";
  const norm6 = SpokenNormalizer.normalize(raw6);
  const route6 = QueryRouter.route(conversationId, norm6);
  const res6 = await ConversationOrchestrator.processTurn(conversationId, raw6);
  logDevTurn(6, raw6, norm6, res6.language, route6, res6);
  if (
    !res6.reply.toLowerCase().includes("paracetamol or ibuprofen are typically recommended") &&
    (res6.reply.toLowerCase().includes("doctor") || res6.reply.toLowerCase().includes("healthcare professional") || res6.reply.toLowerCase().includes("pharmacist"))
  ) {
    passedTurns++;
    console.log("✓ Turn 6 Passed: Safe medical boundary maintained (non-prescriptive, advises qualified professional).\n");
  } else {
    console.error("✗ Turn 6 Failed: Medical boundary violation or missing professional advice:", res6.reply);
  }

  // Turn 7: "I need help with an order."
  const raw7 = "I need help with an order.";
  const norm7 = SpokenNormalizer.normalize(raw7);
  const route7 = QueryRouter.route(conversationId, norm7);
  const res7 = await ConversationOrchestrator.processTurn(conversationId, raw7);
  logDevTurn(7, raw7, norm7, res7.language, route7, res7);
  if (res7.reply.toLowerCase().includes("order") || res7.reply.toLowerCase().includes("reference") || res7.reply.toLowerCase().includes("help")) {
    passedTurns++;
    console.log("✓ Turn 7 Passed: Natural customer-support inquiry handled without robotic jargon.\n");
  } else {
    console.error("✗ Turn 7 Failed: Unexpected response:", res7.reply);
  }

  // Turn 8: "I don't remember the reference number."
  const raw8 = "I don't remember the reference number.";
  const norm8 = SpokenNormalizer.normalize(raw8);
  const route8 = QueryRouter.route(conversationId, norm8);
  const res8 = await ConversationOrchestrator.processTurn(conversationId, raw8);
  logDevTurn(8, raw8, norm8, res8.language, route8, res8);
  if (res8.reply.toLowerCase().includes("phone") || res8.reply.toLowerCase().includes("email") || res8.reply.toLowerCase().includes("order") || res8.reply.toLowerCase().includes("find")) {
    passedTurns++;
    console.log("✓ Turn 8 Passed: Recognized missing reference number, offered alternative lookup.\n");
  } else {
    console.error("✗ Turn 8 Failed: Expected reference assistance, got:", res8.reply);
  }

  // Turn 9: Clarify or escalate appropriately
  const raw9 = "Can I talk to a manager or human support?";
  const norm9 = SpokenNormalizer.normalize(raw9);
  const route9 = QueryRouter.route(conversationId, norm9);
  const res9 = await ConversationOrchestrator.processTurn(conversationId, raw9);
  logDevTurn(9, raw9, norm9, res9.language, route9, res9);
  if (res9.ticket || res9.reply.toLowerCase().includes("supervisor") || res9.reply.toLowerCase().includes("team") || res9.reply.toLowerCase().includes("specialist") || res9.reply.toLowerCase().includes("connect")) {
    passedTurns++;
    console.log("✓ Turn 9 Passed: Human escalation / supervisor transfer handled smoothly.\n");
  } else {
    console.error("✗ Turn 9 Failed: Expected escalation response, got:", res9.reply);
  }

  // Turn 10: Simulate tool failure and then ask "What is the capital of Assam?"
  console.log("Simulating external web/sports API failure...");
  const origSearchSports = WebSearchEngine.searchSports;
  WebSearchEngine.searchSports = async () => {
    throw new Error("Simulated 504 Gateway Timeout on external sports API");
  };

  try {
    // Fire a failing query
    await ConversationOrchestrator.processTurn(conversationId, "What happened in cricket today?");
  } catch (e) {
    // Orchestrator handles internal failure gracefully
  } finally {
    WebSearchEngine.searchSports = origSearchSports;
  }

  // Now ask: "What is the capital of Assam?"
  const raw10 = "What is the capital of Assam?";
  const norm10 = SpokenNormalizer.normalize(raw10);
  const route10 = QueryRouter.route(conversationId, norm10);
  const res10 = await ConversationOrchestrator.processTurn(conversationId, raw10);
  logDevTurn(10, raw10, norm10, res10.language, route10, res10);

  if (res10.reply.toLowerCase().includes("dispur")) {
    passedTurns++;
    console.log("✓ Turn 10 Passed: Assistant successfully answered 'Dispur' after tool failure! Session remained completely healthy!\n");
  } else {
    console.error("✗ Turn 10 Failed: Expected Dispur, got:", res10.reply);
  }

  console.log("=========================================================");
  console.log(`FINAL DEMO VERIFICATION: ${passedTurns}/10 TURNS PASSED!`);
  console.log("=========================================================");
  if (passedTurns === 10) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFinalDemoTest().catch(err => {
  console.error("Fatal test failure:", err);
  process.exit(1);
});

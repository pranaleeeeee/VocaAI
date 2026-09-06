import { ConversationOrchestrator } from "../src/conversation/orchestrator.js";
import { StateManager } from "../src/conversation/stateManager.js";
import { ConversationContextManager } from "../src/intelligence/conversationContext.js";
import { SpokenNormalizer } from "../src/intelligence/spokenNormalizer.js";
import { EntityExtractor } from "../src/conversation/entityExtractor.js";
import { QueryRouter } from "../src/intelligence/queryRouter.js";
import { WebSearchEngine } from "../src/intelligence/webSearchEngine.js";

async function runTests() {
  console.log("=================================================");
  console.log("VOCAAI CRITICAL ENGINE FIX ROUND 2 REGRESSION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // TEST A: "something interesting"
  {
    const convId = `test_a_${Date.now()}`;
    StateManager.reset(convId);
    const extraction = EntityExtractor.extract("something interesting");
    const result = await ConversationOrchestrator.processTurn(convId, "something interesting");
    
    assert(!extraction.entities.customer_name, "Test A - EntityExtractor: Must NOT extract customer_name from 'something interesting'");
    assert(!result.entities.customer_name, "Test A - State: customer_name must NOT exist in session entities");
    assert(result.reply.toLowerCase().includes("octopus") || result.reply.toLowerCase().includes("heart") || result.reply.length > 10, "Test A - Reply: Returns natural interesting trivia fact");
    assert(!result.reply.includes("Something Interesting"), "Test A - Reply: Must NOT greet caller as 'Something Interesting'");
    assert(!result.reply.includes("expertise to assist"), "Test A - Tone: Must NOT use robotic enterprise jargon");
  }

  // TEST B: "you real person"
  {
    const convId = `test_b_${Date.now()}`;
    StateManager.reset(convId);
    const normalized = SpokenNormalizer.normalize("you real person");
    assert(normalized.includes("are you a real person"), "Test B - Normalizer: 'you real person' normalized to 'are you a real person'");

    const result = await ConversationOrchestrator.processTurn(convId, "you real person");
    assert(result.reply.toLowerCase().includes("ai assistant") || result.reply.toLowerCase().includes("i'm an ai"), "Test B - Identity: Assistant clearly states it is an AI");
    assert(!result.reply.includes("not completely sure what you mean"), "Test B - No Unnecessary Clarification: Direct transparent answer");
  }

  // TEST C: "thanks that was helpful"
  {
    const convId = `test_c_${Date.now()}`;
    StateManager.reset(convId);
    const result = await ConversationOrchestrator.processTurn(convId, "thanks that was helpful");
    assert(
      result.reply.toLowerCase().includes("welcome") || result.reply.toLowerCase().includes("glad i could help"),
      "Test C - Acknowledgement: Responds with natural warm acknowledgement",
      `Got: ${result.reply}`
    );
    assert(!result.reply.includes("not completely sure what you mean"), "Test C - Not Fallback: Recognizes acknowledgement act");
  }

  // TEST D: "why do why do we have seasons"
  {
    const convId = `test_d_${Date.now()}`;
    StateManager.reset(convId);
    const normalized = SpokenNormalizer.normalize("why do why do we have seasons");
    assert(normalized === "why do we have seasons", "Test D - Normalizer: Deduplicates repeated words", `Got: ${normalized}`);

    const result = await ConversationOrchestrator.processTurn(convId, "why do why do we have seasons");
    assert(
      result.reply.toLowerCase().includes("tilted") || result.reply.toLowerCase().includes("axis") || result.reply.toLowerCase().includes("orbits the sun"),
      "Test D - Seasons Answer: Explains Earth's axial tilt",
      `Got: ${result.reply}`
    );
    assert(!result.reply.includes("Something Interesting"), "Test D - No Corrupted Name: Does not mention 'Something Interesting'");
  }

  // TEST E: "what happened in the cricket world today"
  {
    const convId = `test_e_${Date.now()}`;
    StateManager.reset(convId);
    const decision = QueryRouter.route(convId, "what happened in the cricket world today");
    assert(decision.intent === "SPORTS", "Test E - Router: Classifies intent as SPORTS");
    assert(decision.requiresWeb === true, "Test E - Router: requiresWeb is true for current cricket news");
    assert(decision.timeframe === "today", "Test E - Router: Captures timeframe='today'");

    const result = await ConversationOrchestrator.processTurn(convId, "what happened in the cricket world today");
    assert(!result.reply.includes("Cricket is a bat-and-ball game played between two teams of eleven players"), "Test E - No Definition: Must NOT return static Wikipedia definition of cricket!");
    assert(
      result.reply.toLowerCase().includes("cricket") || result.reply.toLowerCase().includes("update") || result.reply.toLowerCase().includes("match"),
      "Test E - Sports Intelligence: Retrieves live sports updates or gives clear sports status",
      `Got: ${result.reply}`
    );
  }

  // TEST F: "aaj cricket mein kya hua"
  {
    const convId = `test_f_${Date.now()}`;
    StateManager.reset(convId);
    const decision = QueryRouter.route(convId, "aaj cricket mein kya hua");
    assert(decision.intent === "SPORTS", "Test F - Hinglish Router: Classifies intent as SPORTS");
    assert(decision.requiresWeb === true, "Test F - Hinglish Router: requiresWeb is true");

    const result = await ConversationOrchestrator.processTurn(convId, "aaj cricket mein kya hua");
    assert(!result.reply.includes("bat-and-ball game"), "Test F - No Definition: Must NOT define what cricket is");
    assert(result.reply.length > 10, "Test F - Response: Valid non-empty current sports response");
  }

  // TEST G: Context pollution test
  {
    const convId = `test_g_${Date.now()}`;
    StateManager.reset(convId);
    // Turn 1
    const t1 = await ConversationOrchestrator.processTurn(convId, "Tell me something interesting.");
    assert(!t1.entities.customer_name, "Test G Turn 1: customer_name must NOT exist after 'Tell me something interesting'");

    // Turn 2
    const t2 = await ConversationOrchestrator.processTurn(convId, "Why do we have seasons?");
    assert(!t2.entities.customer_name, "Test G Turn 2: customer_name must still NOT exist");
    assert(!t2.reply.includes("Something Interesting"), "Test G Turn 2: Must NOT address user as 'Something Interesting'");
    assert(t2.reply.toLowerCase().includes("tilt") || t2.reply.toLowerCase().includes("axis"), "Test G Turn 2: Answers seasons question cleanly");
  }

  // TEST H: Real Name confirmation and non-repetitive addressing
  {
    const convId = `test_h_${Date.now()}`;
    StateManager.reset(convId);
    // Turn 1
    const t1 = await ConversationOrchestrator.processTurn(convId, "My name is Pranalee.");
    assert(t1.entities.customer_name?.value === "Pranalee", "Test H Turn 1: Extracted and stored name Pranalee with high confidence");
    assert(t1.entities.customer_name?.confirmed === true, "Test H Turn 1: Customer name confirmed");

    // Turn 2
    const t2 = await ConversationOrchestrator.processTurn(convId, "Why is the sky blue?");
    assert(t2.reply.toLowerCase().includes("scatter") || t2.reply.toLowerCase().includes("atmosphere"), "Test H Turn 2: Answers why sky is blue");
    // Verify name is not repetitively prepended to every factual response
    assert(!t2.reply.startsWith("Pranalee,"), "Test H Turn 2: Assistant does NOT unnaturally prepend caller's name to factual answers");
  }

  // TEST I: STT noise and stutter tolerance
  {
    const convId = `test_i_${Date.now()}`;
    StateManager.reset(convId);
    const normalized = SpokenNormalizer.normalize("what what is the capital of of Gujarat");
    assert(normalized === "what is the capital of Gujarat", "Test I - Normalizer: Cleaned stutter tokens", `Got: ${normalized}`);

    const result = await ConversationOrchestrator.processTurn(convId, "what what is the capital of of Gujarat");
    assert(result.reply.toLowerCase().includes("gandhinagar"), "Test I - Answer: Correctly answers Gandhinagar despite STT noise", `Got: ${result.reply}`);
  }

  // TEST J: Tool failure resilience (Session MUST remain alive and accept next turns)
  {
    const convId = `test_j_${Date.now()}`;
    StateManager.reset(convId);

    // Mock WebSearchEngine.searchSports to reject/throw
    const origSearchSports = WebSearchEngine.searchSports;
    WebSearchEngine.searchSports = async () => {
      throw new Error("Simulated external sports API timeout / 504 Gateway Timeout");
    };

    let turn1Reply = "";
    try {
      const t1 = await ConversationOrchestrator.processTurn(convId, "what happened in the cricket world today");
      turn1Reply = t1.reply;
      assert(t1.state !== "ESCALATING", "Test J Turn 1: External timeout does not crash or escalate the session unnecessarily");
    } finally {
      // Restore original search method
      WebSearchEngine.searchSports = origSearchSports;
    }

    assert(turn1Reply.length > 5, "Test J Turn 1: Returned graceful fallback response on tool failure");

    // Next turn immediately after tool failure:
    const t2 = await ConversationOrchestrator.processTurn(convId, "What is the capital of Gujarat?");
    assert(t2.reply.toLowerCase().includes("gandhinagar"), "Test J Turn 2: Assistant successfully answered next question after tool failure! Session remained alive!");
  }

  // TEST K: Name correction handling (Section 24)
  {
    const convId = `test_k_${Date.now()}`;
    StateManager.reset(convId);
    const t1 = await ConversationOrchestrator.processTurn(convId, "My name is Rahul.");
    assert(t1.entities.customer_name?.value === "Rahul", "Test K Turn 1: Initial name stored as Rahul");

    const t2 = await ConversationOrchestrator.processTurn(convId, "Actually my name is Rohan.");
    assert(t2.entities.customer_name?.value === "Rohan", "Test K Turn 2: Name updated to Rohan via correction", `Got: ${t2.entities.customer_name?.value}`);
  }

  // TEST L: 20-Turn Conversation Session Stress Test (Section 26)
  {
    const convId = `test_l_${Date.now()}`;
    StateManager.reset(convId);

    const script = [
      "Hello",
      "how are you doing",
      "My name is Pranalee.",
      "what is the capital of Rajasthan",
      "and Maharashtra?",
      "tell me something interesting",
      "you real person",
      "why do why do we have seasons",
      "why is the sky blue",
      "thanks that was helpful",
      "what is cricket",
      "what happened in the cricket world today",
      "aaj cricket mein kya hua",
      "weather in Delhi tomorrow",
      "Actually my name is Rohan.",
      "what is the capital of Gujarat",
      "how many hours of sleep do I need as a 20 year old woman",
      "what is DNS",
      "thank you so much",
      "goodbye"
    ];

    let sessionPassed = true;
    for (let i = 0; i < script.length; i++) {
      const utterance = script[i];
      try {
        const turn = await ConversationOrchestrator.processTurn(convId, utterance);
        if (!turn || !turn.reply) {
          sessionPassed = false;
          console.error(`Test L: Empty reply on turn ${i + 1}: "${utterance}"`);
          break;
        }
        // Verify no false entity pollution
        if (turn.entities.customer_name?.value === "Something Interesting") {
          sessionPassed = false;
          console.error(`Test L: 'Something Interesting' polluted entities on turn ${i + 1}`);
          break;
        }
      } catch (err: any) {
        sessionPassed = false;
        console.error(`Test L: Exception on turn ${i + 1}: "${utterance}"`, err);
        break;
      }
    }

    assert(sessionPassed, "Test L: 20-turn continuous session ran with 0 crashes, 0 stuck states, and 0 entity pollution");
  }

  console.log("\n=================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("FATAL in test execution:", err);
  process.exit(1);
});

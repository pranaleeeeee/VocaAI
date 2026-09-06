import { QueryRouter } from "../src/intelligence/queryRouter.js";
import { KnowledgeEngine } from "../src/intelligence/knowledgeEngine.js";
import { PrioritizedFlow } from "../src/conversation/prioritizedFlow.js";
import { ConversationContextManager } from "../src/intelligence/conversationContext.js";
import { BuddyEngine } from "../src/conversation/buddyEngine.js";
import { SolutionEngine } from "../src/conversation/solutionEngine.js";

async function runTests() {
  console.log("=== RUNNING ARCHITECTURE REGRESSION TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName} - ${detail || "Assertion failed"}`);
      failed++;
    }
  }

  // --- SECTION 29 PRIMARY TESTS ---

  // Test 1: Airplane flight
  {
    const q = "why do aeroplanes stay in the air";
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", q, "test-plane");
    assert(
      !res.prompt.includes("Artificial Intelligence") &&
      (res.prompt.toLowerCase().includes("lift") || res.prompt.toLowerCase().includes("wing")),
      "Test 1: Airplane flight physics answered without AI definition",
      `Got: ${res.prompt}`
    );
  }

  // Test 2: Ocean salty
  {
    const q = "why is the ocean salty";
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", q, "test-ocean");
    assert(
      !res.prompt.includes("Frank Ocean") &&
      (res.prompt.toLowerCase().includes("mineral") || res.prompt.toLowerCase().includes("salt") || res.prompt.toLowerCase().includes("rock")),
      "Test 2: Ocean salinity answered without Frank Ocean or music",
      `Got: ${res.prompt}`
    );
  }

  // Test 3: Context clarification ("Can you send me one?")
  {
    ConversationContextManager.reset("test-python-convo");
    // Turn 1
    await PrioritizedFlow.determineNextStep("general", {}, "English", "Tell me about Python.", "test-python-convo");
    // Turn 2
    const res2 = await PrioritizedFlow.determineNextStep("general", {}, "English", "Can you send me one?", "test-python-convo");
    assert(
      res2.prompt.toLowerCase().includes("what would you like me to send") ||
      res2.prompt.toLowerCase().includes("python.org") ||
      res2.prompt.toLowerCase().includes("code"),
      "Test 3: 'Can you send me one?' after Python asks clarification without dictionary 'Send' entry",
      `Got: ${res2.prompt}`
    );
  }

  // Test 4: Parcel return without hallucinated enterprise policy
  {
    const q = "how do I return my parcel";
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", q, "test-parcel");
    assert(
      !res.prompt.includes("standard 7-day return protocol") &&
      !res.prompt.includes("complimentary doorstep reverse logistics") &&
      (res.prompt.toLowerCase().includes("return") && (res.prompt.toLowerCase().includes("policy") || res.prompt.toLowerCase().includes("order"))),
      "Test 4: Parcel return provides realistic guidance without hallucinated policies",
      `Got: ${res.prompt}`
    );
  }

  // Test 5: Multi-turn parcel return followed by Hindi emotional reassurance
  {
    ConversationContextManager.reset("test-multiturn-hindi");
    // Turn 1
    await PrioritizedFlow.determineNextStep("general", {}, "English", "how do I return my parcel", "test-multiturn-hindi");
    // Turn 2
    const resTurn2 = await PrioritizedFlow.determineNextStep("general", {}, "Hindi + English", "Mere Sath Kuchh galat hua hai kya", "test-multiturn-hindi");
    assert(
      !resTurn2.prompt.includes("standard 7-day return protocol") &&
      !resTurn2.prompt.includes("reverse logistics") &&
      !resTurn2.prompt.includes("7-divasiya") &&
      (resTurn2.prompt.toLowerCase().includes("theek") || resTurn2.prompt.toLowerCase().includes("alright") || resTurn2.prompt.toLowerCase().includes("chinta")),
      "Test 5: 'Mere Sath Kuchh galat hua hai kya' receives empathetic Hindi response, no parcel policy repetition",
      `Got: ${resTurn2.prompt}`
    );
  }

  // Test 6: Phone charging
  {
    const q = "can I charge my phone";
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", q, "test-charge");
    assert(
      !res.prompt.includes("999") &&
      (res.prompt.toLowerCase().includes("charge") && res.prompt.toLowerCase().includes("battery")),
      "Test 6: Phone charging gives literal battery advice, no 999 myth",
      `Got: ${res.prompt}`
    );
  }

  // Test 7: Yellow color
  {
    const q = "why is yellow colour so yellow";
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", q, "test-yellow");
    assert(
      res.prompt.toLowerCase().includes("wavelength") ||
      res.prompt.toLowerCase().includes("cone") ||
      res.prompt.toLowerCase().includes("photoreceptor") ||
      res.prompt.toLowerCase().includes("570"),
      "Test 7: Yellow color answered scientifically",
      `Got: ${res.prompt}`
    );
  }

  // Test 8: Almonds vs Walnuts comparison
  {
    const q = "should I have almonds or walnuts";
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", q, "test-nuts");
    assert(
      (res.prompt.toLowerCase().includes("vitamin e") || res.prompt.toLowerCase().includes("calcium")) &&
      (res.prompt.toLowerCase().includes("omega-3") || res.prompt.toLowerCase().includes("heart")),
      "Test 8: Almonds vs Walnuts gives objective nutritional comparison",
      `Got: ${res.prompt}`
    );
  }

  // Test 9: Apple news routing
  {
    const q = "what happening with Apple today";
    const decision = QueryRouter.route("test-apple-news", q, "English");
    assert(
      decision.intent === "NEWS" &&
      decision.requiresWeb === true &&
      Boolean(decision.topic?.toLowerCase().includes("apple")),
      "Test 9: 'what happening with Apple today' routed to NEWS for Apple Inc.",
      `Got: intent=${decision.intent}, topic=${decision.topic}, web=${decision.requiresWeb}`
    );

    const res = await PrioritizedFlow.determineNextStep("news", {}, "English", q, "test-apple-news");
    assert(
      !res.prompt.includes("Do you mean Apple the technology company, or apple the fruit?") &&
      res.prompt.length > 20,
      "Test 9.1: 'what happening with Apple today' executes news search without ambiguity prompt",
      `Got: ${res.prompt}`
    );
  }

  // Test 10: "what's Apple doing today"
  {
    const q = "what's Apple doing today";
    const decision = QueryRouter.route("test-apple-doing", q, "English");
    assert(
      decision.intent === "NEWS" &&
      decision.requiresWeb === true &&
      Boolean(decision.topic?.toLowerCase().includes("apple")),
      "Test 10: 'what's Apple doing today' routed to NEWS for Apple Inc.",
      `Got: intent=${decision.intent}, topic=${decision.topic}`
    );
  }

  // --- SECTION 30 REGRESSION SCENARIOS (20 TESTS) ---

  // S30.1: Ice floating
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "why does ice float on water", "s30-ice");
    assert(
      res.prompt.toLowerCase().includes("dense") || res.prompt.toLowerCase().includes("expand"),
      "S30.1: Ice floating on water",
      `Got: ${res.prompt}`
    );
  }

  // S30.2: Magnets attraction
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "why do magnets attract", "s30-magnets");
    assert(
      res.prompt.toLowerCase().includes("magnetic field") || res.prompt.toLowerCase().includes("electron"),
      "S30.2: Why magnets attract",
      `Got: ${res.prompt}`
    );
  }

  // S30.3: RAM vs storage
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "difference between RAM and storage", "s30-ram");
    assert(
      res.prompt.toLowerCase().includes("volatile") || res.prompt.toLowerCase().includes("temporary"),
      "S30.3: Difference between RAM and storage",
      `Got: ${res.prompt}`
    );
  }

  // S30.4: Plane takeoff
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "how does a plane take off", "s30-takeoff");
    assert(
      res.prompt.toLowerCase().includes("runway") || res.prompt.toLowerCase().includes("lift"),
      "S30.4: How a plane takes off",
      `Got: ${res.prompt}`
    );
  }

  // S30.5: Space trivia
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "tell me a fact about space", "s30-space");
    assert(
      res.prompt.toLowerCase().includes("silent") || res.prompt.toLowerCase().includes("vacuum"),
      "S30.5: Space trivia",
      `Got: ${res.prompt}`
    );
  }

  // S30.6: Power outage advice
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "what to do during power outage", "s30-outage");
    assert(
      res.prompt.toLowerCase().includes("refrigerator") || res.prompt.toLowerCase().includes("flashlight"),
      "S30.6: Power outage practical advice",
      `Got: ${res.prompt}`
    );
  }

  // S30.7: Pen cost
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "how much does a pen cost", "s30-pen");
    assert(
      res.prompt.toLowerCase().includes("ballpoint") || res.prompt.toLowerCase().includes("cost"),
      "S30.7: Pen cost pricing explanation",
      `Got: ${res.prompt}`
    );
  }

  // S30.8: Tokyo weather
  {
    const decision = QueryRouter.route("s30-weather-tokyo", "what's the weather in Tokyo right now", "English");
    assert(
      decision.intent === "WEATHER" && Boolean(decision.location?.toLowerCase().includes("tokyo")),
      "S30.8: Tokyo weather intent and location",
      `Got: intent=${decision.intent}, location=${decision.location}`
    );
  }

  // S30.9: Cricket updates
  {
    const decision = QueryRouter.route("s30-cricket", "latest cricket updates today", "English");
    assert(
      decision.intent === "SPORTS" && decision.requiresWeb === true,
      "S30.9: Cricket live updates intent",
      `Got: intent=${decision.intent}, web=${decision.requiresWeb}`
    );
  }

  // S30.10: Capital of Rajasthan
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "what is the capital of Rajasthan", "s30-raj");
    assert(
      res.prompt.includes("Jaipur"),
      "S30.10: Capital of Rajasthan is Jaipur",
      `Got: ${res.prompt}`
    );
  }

  // S30.11: Fever medication safety boundary
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "I have a fever, what medicine can I take", "s30-fever");
    assert(
      res.prompt.toLowerCase().includes("can't recommend a specific medicine") ||
      res.prompt.toLowerCase().includes("healthcare professional"),
      "S30.11: Fever medication triggers safety boundary without prescriptions",
      `Got: ${res.prompt}`
    );
  }

  // S30.12: Sleep hours
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "how many hours of sleep do I need as a 20 year old woman", "s30-sleep");
    assert(
      res.prompt.includes("7") && res.prompt.includes("9"),
      "S30.12: Sleep hours for 20-year-old (7 to 9 hours)",
      `Got: ${res.prompt}`
    );
  }

  // S30.13: Water shortage
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "what to do when there is a water shortage in my area", "s30-water");
    assert(
      res.prompt.toLowerCase().includes("drinking") || res.prompt.toLowerCase().includes("municipal"),
      "S30.13: Water shortage practical guidance",
      `Got: ${res.prompt}`
    );
  }

  // S30.14: Ambiguity "can I get a number from someone I don't know"
  {
    const decision = QueryRouter.route("s30-num", "can I get a number from someone I don't know", "English");
    assert(
      decision.intent === "CLARIFICATION" && decision.isAmbiguous === true,
      "S30.14: Ambiguous number query requires clarification",
      `Got: intent=${decision.intent}`
    );
  }

  // S30.15: Ambiguity "Tell me about Apple"
  {
    const decision = QueryRouter.route("s30-apple", "Tell me about Apple", "English");
    assert(
      decision.intent === "CLARIFICATION" && Boolean(decision.clarificationPrompt?.includes("fruit")),
      "S30.15: 'Tell me about Apple' disambiguates tech company vs fruit",
      `Got: ${decision.clarificationPrompt}`
    );
  }

  // S30.16: "how are you doing"
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "how are you doing", "s30-howareyou");
    assert(
      res.prompt.toLowerCase().includes("doing great") || res.prompt.toLowerCase().includes("assist you"),
      "S30.16: 'how are you doing' returns friendly greeting",
      `Got: ${res.prompt}`
    );
  }

  // S30.17: "something interesting"
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "something interesting", "s30-interesting");
    assert(
      res.prompt.toLowerCase().includes("octopus") || res.prompt.toLowerCase().includes("three hearts"),
      "S30.17: 'something interesting' returns octopus trivia, not user's name",
      `Got: ${res.prompt}`
    );
  }

  // S30.18: "Mujhe samajh nahi aa raha"
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "Hindi + English", "Mujhe samajh nahi aa raha", "s30-samajh");
    assert(
      res.prompt.toLowerCase().includes("samjha") || res.prompt.toLowerCase().includes("kiske baare"),
      "S30.18: Hindi comprehension clarification",
      `Got: ${res.prompt}`
    );
  }

  // S30.19: "I need help with something"
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "I need help with something", "s30-help");
    assert(
      res.prompt.toLowerCase().includes("what specific") || res.prompt.toLowerCase().includes("happy to help"),
      "S30.19: 'I need help with something' asks what to help with",
      `Got: ${res.prompt}`
    );
  }

  // S30.20: "I don't remember my reference number"
  {
    const res = await PrioritizedFlow.determineNextStep("general", {}, "English", "I don't remember my reference number", "s30-ref");
    assert(
      res.prompt.toLowerCase().includes("confirmation email") || res.prompt.toLowerCase().includes("phone number"),
      "S30.20: Reference recovery guidance",
      `Got: ${res.prompt}`
    );
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});

import { ConversationEntities } from "../types/serverTypes.js";
import { SolutionEngine } from "./solutionEngine.js";
import { BuddyEngine } from "./buddyEngine.js";
import { QueryRouter } from "../intelligence/queryRouter.js";
import { WebSearchEngine, WebSourceItem } from "../intelligence/webSearchEngine.js";
import { ConversationContextManager } from "../intelligence/conversationContext.js";

export interface PrioritizedNextStep {
  type: "CONFIRM_FIELD" | "ASK_MISSING" | "RESOLVE" | "ANSWER" | "CLARIFY";
  field?: keyof ConversationEntities;
  prompt: string;
  hindiPrompt?: string;
  source?: string;
  sources?: WebSourceItem[];
}

export class PrioritizedFlow {
  /**
   * Evaluates collected information, user intent, knowledge requirements, and live web data
   * to select the most responsive, natural answer or customer support action.
   */
  public static async determineNextStep(
    intent: string,
    entities: ConversationEntities,
    language: "English" | "Hindi" | "Hindi + English",
    utteranceText: string = "",
    conversationId: string = "default"
  ): Promise<PrioritizedNextStep> {
    const isHindi = language === "Hindi" || language === "Hindi + English";
    const lower = utteranceText.toLowerCase().trim();

    const hasOrder = !!entities.order_id?.value;
    const orderNum = entities.order_id?.value || "";
    const isOrderConfirmed = !!entities.order_id?.confirmed;
    const customerName = entities.customer_name?.value;
    const customerPhone = entities.customer_phone?.value;

    // 1. Check if caller introduced their name
    const isNameIntroduction =
      lower.includes("my name is") ||
      lower.includes("mera naam") ||
      lower.includes("call me") ||
      /^i am\s+[a-z]+/i.test(lower) ||
      /^i'm\s+[a-z]+/i.test(lower);

    if (isNameIntroduction && customerName) {
      return {
        type: "ANSWER",
        field: "customer_name",
        prompt: `Nice to meet you, ${customerName}. How can I help you today?`,
        hindiPrompt: `Namaste ${customerName} ji! Main aaj aapki kya sahayata kar sakta hoon?`
      };
    }

    // 2. Check if caller provided phone number
    const isPhoneMention = !!customerPhone && lower.includes(customerPhone);
    if (isPhoneMention && customerPhone) {
      return {
        type: "ANSWER",
        field: "customer_phone",
        prompt: `Thank you. I have verified and registered your contact telephone number as ${customerPhone}. How may I proceed to assist you?`,
        hindiPrompt: `Dhanyavaad. Maine aapka sampark number ${customerPhone} record me darj kar liya hai. Aage main aapki kya sahayata karoon?`
      };
    }

    // 3. Unconfirmed Order ID explicitly provided (e.g. Test 5: "Haan, 458921")
    if (entities.order_id && !entities.order_id.confirmed) {
      return {
        type: "CONFIRM_FIELD",
        field: "order_id",
        prompt: `To ensure precision in our records, could you confirm if your order identifier is ${entities.order_id.value}?`,
        hindiPrompt: `Pusthi ke liye kripya confirm karein, kya aapka order ID ${entities.order_id.value} sahi hai?`
      };
    }

    // 4. Intent Classification & Routing via QueryRouter
    const decision = QueryRouter.route(conversationId, utteranceText, language);
    console.log(`[VocaAI Intel] USER: "${utteranceText}" | ROUTER: intent=${decision.intent}, tool=${decision.tool}, loc=${decision.location || "N/A"}, tf=${decision.timeframe || "N/A"}, web=${decision.requiresWeb}`);

    // 4.1 Ambiguity Resolution (e.g. "Tell me about Apple", "Can I get a number from someone I don't know")
    if (decision.intent === "CLARIFICATION" && decision.clarificationPrompt) {
      return {
        type: "CLARIFY",
        prompt: decision.clarificationPrompt,
        hindiPrompt: decision.clarificationPrompt,
        source: "Disambiguation Engine"
      };
    }

    // 4.2 Direct Answers (Knowledge, Casual, Language Switch, Follow-up, or Medical Safety Boundary)
    if (decision.directAnswer) {
      ConversationContextManager.recordTurn(conversationId, "assistant", decision.directAnswer, {
        intent: decision.intent,
        topic: decision.topic,
        person: decision.topic?.includes("Modi") ? "Narendra Modi" : undefined
      });

      return {
        type: "ANSWER",
        prompt: decision.directAnswer,
        hindiPrompt: decision.directAnswer,
        source: decision.safetyCategory === "medical_treatment" ? "Medical Safety Boundary" : decision.intent === "NEWS" ? "Live News Intelligence" : "Knowledge Engine"
      };
    }

    // 4.3 Real-Time Live Weather Flow (Verified wttr.in weather lookup)
    if (decision.intent === "WEATHER" && decision.tool === "weather") {
      const loc = decision.location || "Gujarat";
      const tf = decision.timeframe || "now";
      const weatherInfo = await BuddyEngine.getLiveWeather(utteranceText, loc, tf);

      ConversationContextManager.recordTurn(conversationId, "assistant", weatherInfo || "Weather unavailable", {
        intent: "WEATHER",
        location: loc,
        timeframe: tf,
        topic: "current weather"
      });

      if (weatherInfo) {
        return {
          type: "ANSWER",
          prompt: weatherInfo,
          hindiPrompt: weatherInfo,
          source: "Live Weather (wttr.in)"
        };
      } else {
        const failMsg = isHindi
          ? "Main abhi mausam ki taaza jaankari prapt karne me asamarth hoon."
          : "I'm unable to get the latest weather data right now.";
        return {
          type: "ANSWER",
          prompt: failMsg,
          hindiPrompt: failMsg,
          source: "Live Weather"
        };
      }
    }

    // 4.4 Real-Time Current News Flow (Web Search)
    if (decision.intent === "NEWS" && decision.searchQuery) {
      const searchRes = await WebSearchEngine.searchCurrentNews(decision.searchQuery, language);
      ConversationContextManager.recordTurn(conversationId, "assistant", searchRes.summary, {
        intent: "NEWS",
        topic: decision.topic || "Current News",
        location: decision.location || decision.topic,
        searchQuery: decision.searchQuery,
        headlines: searchRes.sources
      });

      return {
        type: "ANSWER",
        prompt: searchRes.summary,
        hindiPrompt: searchRes.hindiSummary,
        source: "Live News Intelligence",
        sources: searchRes.sources
      };
    }

    // 4.5 Real-Time Current Sports Flow (Live Sports & News with 3.5s timeout)
    if (decision.intent === "SPORTS") {
      const sportsQuery = decision.searchQuery || utteranceText;
      const searchRes = await WebSearchEngine.searchSports(sportsQuery, language);
      ConversationContextManager.recordTurn(conversationId, "assistant", searchRes.summary, {
        intent: "SPORTS",
        topic: decision.topic || "Current Sports",
        timeframe: decision.timeframe || "today",
        searchQuery: sportsQuery,
        headlines: searchRes.sources
      });

      return {
        type: "ANSWER",
        prompt: searchRes.summary,
        hindiPrompt: searchRes.hindiSummary,
        source: "Live Sports Intelligence",
        sources: searchRes.sources
      };
    }

    // 5. Customer SolutionEngine for specific support actions (returns, tracking, payments, cancellations, etc.)
    const isEnterpriseSupportIntent =
      decision.intent === "TASK_REQUEST" ||
      hasOrder ||
      Boolean(entities.order_id?.value) ||
      lower.includes("cancel") ||
      lower.includes("track") ||
      lower.includes("order") ||
      lower.includes("delivery");

    if (isEnterpriseSupportIntent) {
      const solution = SolutionEngine.solve(utteranceText, language, {
        customer_name: customerName,
        order_id: entities.order_id?.value,
        customer_phone: customerPhone
      });

      if (solution.hasDirectSolution) {
        return {
          type: "ANSWER",
          field: solution.fieldNeeded,
          prompt: solution.solution,
          hindiPrompt: solution.hindiSolution
        };
      }
    }

    // 6. Check Everyday Buddy Engine for explicit live tools (health guidance, live time, math)
    const isExplicitBuddyQuery = lower.includes("time") || lower.includes("capital") ||
      lower.includes("calculate") || lower.includes("math") || lower.includes("samay") ||
      lower.includes("tareekh") || lower.includes("fever") || lower.includes("medicine") || lower.includes("headache") ||
      lower.includes("cold") || lower.includes("cough") || lower.includes("bukhar") || lower.includes("dawa") ||
      lower.includes("who are you") || lower.includes("who made you");

    if (isExplicitBuddyQuery) {
      const buddy = await BuddyEngine.handleBuddyInteraction(utteranceText, language, customerName);
      if (buddy.isBuddyTopic && buddy.reply) {
        return {
          type: "ANSWER",
          prompt: buddy.reply,
          hindiPrompt: buddy.reply,
          source: buddy.source
        };
      }
    }

    // 7. If Order was just confirmed by caller
    if (hasOrder && isOrderConfirmed) {
      return {
        type: "RESOLVE",
        prompt: `Order #${orderNum} has been confirmed. Would you like me to check tracking, start a return, or check payment status for this order?`,
        hindiPrompt: `Order #${orderNum} pramanit ho chuka hai. Kya aap tracking dekhna chahte hain, return shuru karna chahte hain, ya payment status janna chahte hain?`
      };
    }

    // 8. Pure Greeting without any questions or actions
    const isGreeting = /^(hello|hi|hey|namaste|good morning|good afternoon|good evening|pranam)\b/i.test(lower) ||
      lower === "hello" || lower === "hi" || lower === "namaste";
    const hasQuestion = utteranceText.includes("?") || Boolean(utteranceText.match(/(what|where|how|when|who|why|which|can|tell|give|explain|time|weather|price|order|return|refund|kya|kab|kaise|kahan|kyun|batao|kitna|capital|currency)/i));

    if (isGreeting && !hasQuestion) {
      if (!customerName) {
        return {
          type: "ASK_MISSING",
          field: "customer_name",
          prompt: "Hello! Welcome to VocaAI. How can I help you today?",
          hindiPrompt: "Namaste! VocaAI me aapka swagat hai. Main aaj aapki kya madad kar sakta hoon?"
        };
      } else {
        return {
          type: "ANSWER",
          prompt: "Hello! How can I help you today?",
          hindiPrompt: "Namaste! Main aaj aapki kya madad kar sakta hoon?"
        };
      }
    }

    // 9. If query had an explicit named entity definition that can be verified from authoritative knowledge base
    const isExplicitWikiQuery =
      /^(who is|who was|what is|what are|define|explain)\s+[a-z0-9\s]+$/i.test(utteranceText.trim()) &&
      !lower.includes("weather") &&
      !lower.includes("today") &&
      !lower.includes("aaj") &&
      !lower.includes("price") &&
      !lower.includes("cost");

    if (isExplicitWikiQuery) {
      const fallbackWiki = await BuddyEngine.getWikiSummary(utteranceText);
      if (fallbackWiki) {
        return {
          type: "ANSWER",
          prompt: fallbackWiki,
          hindiPrompt: fallbackWiki,
          source: "Knowledge Base"
        };
      }
    }

    // 10. Natural conversational fallback (Friendly, concise voice assistant tone)
    return {
      type: "ANSWER",
      prompt: "I'm not completely sure what you mean. Could you tell me a little more?",
      hindiPrompt: "Main poori tarah samajh nahi paaya. Kripya thoda aur vistaar se batayein?"
    };
  }
}

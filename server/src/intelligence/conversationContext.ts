import { IntentType } from "./types.js";

export interface ContextState {
  conversationId: string;
  lastTopic?: string;
  lastPerson?: string;
  lastLocation?: string;
  lastTimeframe?: string;
  lastIntent?: IntentType;
  lastSearchQuery?: string;
  languagePreference?: "English" | "Hindi" | "Hindi + English";
  recentHeadlines?: Array<{ title: string; publisher?: string; url?: string; time?: string }>;
  turns: Array<{
    role: "user" | "assistant";
    text: string;
    intent?: IntentType;
    topic?: string;
    location?: string;
    timeframe?: string;
    timestamp: number;
  }>;
}

export class ConversationContextManager {
  private static sessions: Map<string, ContextState> = new Map();

  public static get(conversationId: string): ContextState {
    let state = this.sessions.get(conversationId);
    if (!state) {
      state = {
        conversationId,
        turns: []
      };
      this.sessions.set(conversationId, state);
    }
    return state;
  }

  public static recordTurn(
    conversationId: string,
    role: "user" | "assistant",
    text: string,
    metadata?: {
      intent?: IntentType;
      topic?: string;
      person?: string;
      location?: string;
      timeframe?: string;
      languagePreference?: "English" | "Hindi" | "Hindi + English";
      searchQuery?: string;
      headlines?: Array<{ title: string; publisher?: string; url?: string; time?: string }>;
    }
  ): void {
    const ctx = this.get(conversationId);
    ctx.turns.push({
      role,
      text,
      intent: metadata?.intent,
      topic: metadata?.topic,
      location: metadata?.location,
      timeframe: metadata?.timeframe,
      timestamp: Date.now()
    });

    // Keep context window reasonably bounded (last 10 turns)
    if (ctx.turns.length > 10) {
      ctx.turns = ctx.turns.slice(-10);
    }

    if (metadata?.intent) ctx.lastIntent = metadata.intent;
    if (metadata?.topic) ctx.lastTopic = metadata.topic;
    if (metadata?.person) ctx.lastPerson = metadata.person;
    if (metadata?.location) ctx.lastLocation = metadata.location;
    if (metadata?.timeframe) ctx.lastTimeframe = metadata.timeframe;
    if (metadata?.languagePreference) ctx.languagePreference = metadata.languagePreference;
    if (metadata?.searchQuery) ctx.lastSearchQuery = metadata.searchQuery;
    if (metadata?.headlines) ctx.recentHeadlines = metadata.headlines;
  }

  public static reset(conversationId?: string): void {
    if (conversationId) {
      this.sessions.delete(conversationId);
    } else {
      this.sessions.clear();
    }
  }

  /**
   * Resolves elliptical and pronoun references like "he", "she", "what about tomorrow?", "and Maharashtra?"
   */
  public static resolveFollowUp(conversationId: string, utterance: string): {
    resolvedQuery: string;
    inferredTopic?: string;
    inferredPerson?: string;
    inferredLocation?: string;
    inferredTimeframe?: string;
    isFollowUp: boolean;
  } {
    const ctx = this.get(conversationId);
    const lower = utterance.toLowerCase().trim();

    // Context Relevance Gating: If current turn introduces an independent subject, do not pollute with previous context
    const isIndependentQuery =
      lower.includes("cricket") ||
      lower.includes("season") ||
      lower.includes("sky") ||
      lower.includes("capital") ||
      lower.includes("rajdhani") ||
      lower.includes("interesting") ||
      lower.includes("order") ||
      lower.includes("refund") ||
      lower.includes("cancel") ||
      lower.includes("real person") ||
      lower.includes("human") ||
      lower.includes("mere sath") ||
      lower.includes("galat") ||
      lower.includes("aeroplane") ||
      lower.includes("airplane") ||
      lower.includes("ocean") ||
      lower.includes("earthquake") ||
      lower.includes("bluetooth") ||
      lower.includes("dns") ||
      lower.includes("phone") ||
      lower.includes("almond") ||
      lower.includes("walnut") ||
      lower.includes("yellow") ||
      lower.includes("bored") ||
      lower.includes("apple") ||
      lower.includes("help") ||
      lower.includes("samajh") ||
      lower.includes("fever") ||
      lower.includes("cold") ||
      lower.includes("medicine") ||
      lower.includes("bukhar");

    // 1. Weather Timeframe Follow-Up: e.g. "What about tomorrow?", "kal kaisa hoga?", "and tomorrow?"
    const isWeatherTimeframeFollowUp =
      !isIndependentQuery &&
      (ctx.lastIntent === "WEATHER" || ctx.lastTopic?.toLowerCase().includes("weather")) &&
      (/^(what about|how about|and|aur)?\s*(tomorrow|kal|today|aaj|next week|weekend|now)\b/i.test(lower) ||
        (/^(tomorrow|kal|today|aaj)\b/i.test(lower) && !lower.includes("cricket")));

    if (isWeatherTimeframeFollowUp && (ctx.lastLocation || ctx.lastTopic)) {
      const loc = ctx.lastLocation || "Mumbai";
      let tf = "tomorrow";
      if (lower.includes("now") || lower.includes("today") || lower.includes("abhi") || lower.includes("aaj")) {
        tf = "now";
      }
      return {
        resolvedQuery: `weather in ${loc} ${tf}`,
        inferredTopic: "current weather",
        inferredLocation: loc,
        inferredTimeframe: tf,
        isFollowUp: true
      };
    }

    // 1.5 Weather Location Follow-Up: e.g. "And Delhi?", "How about Delhi?", "What about London?"
    const isWeatherLocationFollowUp =
      !isIndependentQuery &&
      (ctx.lastIntent === "WEATHER" || ctx.lastTopic?.toLowerCase().includes("weather")) &&
      (/^(and|aur|how about|what about)\s+([A-Za-z\s]+)[?.]?$/i.test(lower));

    if (isWeatherLocationFollowUp) {
      const locMatch = lower.replace(/^(and|aur|how about|what about)\s+/i, "").replace(/[?.,!]/g, "").trim();
      if (locMatch.length > 2 && !["tomorrow", "today", "yesterday", "cricket", "python"].includes(locMatch)) {
        const newLoc = locMatch.charAt(0).toUpperCase() + locMatch.slice(1);
        return {
          resolvedQuery: `weather in ${newLoc} now`,
          inferredTopic: "current weather",
          inferredLocation: newLoc,
          inferredTimeframe: "now",
          isFollowUp: true
        };
      }
    }

    // 2. Capital / General Knowledge Follow-Up: e.g. "And Maharashtra?", "aur Bihar?"
    const isCapitalFollowUp =
      (ctx.lastTopic?.toLowerCase().includes("capital") || ctx.lastTopic?.toLowerCase().includes("rajdhani")) &&
      (/^(and|aur|what about|how about)\s+[a-zA-Z\s]+[?.]?$/i.test(lower) || lower.startsWith("and ") || lower.startsWith("aur "));

    if (isCapitalFollowUp) {
      const cleanedEntity = lower.replace(/^(and|aur|what about|how about)\s+/i, "").replace(/[?.,!]/g, "").trim();
      if (cleanedEntity.length > 2) {
        return {
          resolvedQuery: `what is the capital of ${cleanedEntity}`,
          inferredTopic: `${cleanedEntity} capital`,
          isFollowUp: true
        };
      }
    }

    // 3. Pronoun or elliptical query regarding a person
    const isPersonFollowUp =
      /^(how old is (he|she|they)|what is (his|her) age|unki umar kya hai|uski umar|kaun hai|kahan ke hain)\b/i.test(lower) ||
      (ctx.lastPerson && (lower.includes("how old") || lower.includes("umar") || lower.includes("age")) &&
        (lower.includes("he") || lower.includes("she") || lower.includes("unka") || lower.includes("uski") || lower.includes("his") || lower.includes("her")));

    if (isPersonFollowUp && ctx.lastPerson) {
      return {
        resolvedQuery: `how old is ${ctx.lastPerson}`,
        inferredTopic: ctx.lastPerson,
        inferredPerson: ctx.lastPerson,
        isFollowUp: true
      };
    }

    // 4. Location follow-up under previous news context (e.g. "Aur Gujarat mein kya chal raha hai?")
    const hasNewsContext = ctx.lastIntent === "NEWS" || ctx.lastTopic?.toLowerCase().includes("news");
    const isRegionalNewsFollowUp =
      hasNewsContext &&
      (lower.startsWith("aur ") || lower.startsWith("and ") || lower.includes("kya chal raha") || lower.includes("what is happening") || lower.includes("what's happening")) &&
      Boolean(lower.match(/(gujarat|delhi|mumbai|karnataka|punjab|maharashtra|india|world|us|uk|bihar|bengal)/i));

    if (isRegionalNewsFollowUp) {
      const locMatch = lower.match(/(gujarat|delhi|mumbai|karnataka|punjab|maharashtra|india|world|us|uk|bihar|bengal)/i);
      const loc = locMatch ? locMatch[0] : (ctx.lastLocation || "Gujarat");
      const normalizedLoc = loc.charAt(0).toUpperCase() + loc.slice(1);
      return {
        resolvedQuery: `latest ${normalizedLoc} news today`,
        inferredTopic: `${normalizedLoc} news`,
        inferredLocation: normalizedLoc,
        isFollowUp: true
      };
    }

    // 5. Language change request on same context (e.g. "Actually, Hindi mein batao.")
    const isLanguageSwitchRequest =
      /^(actually,?\s*)?(hindi mein batao|hindi me bolo|hindi me|explain in hindi|say it in hindi|english please|speak in english)\b/i.test(lower);

    if (isLanguageSwitchRequest) {
      const targetLang = (lower.includes("hindi") ? "Hindi" : "English") as "English" | "Hindi";
      ctx.languagePreference = targetLang;
      return {
        resolvedQuery: ctx.lastSearchQuery || ctx.lastTopic || utterance,
        inferredTopic: ctx.lastTopic,
        inferredPerson: ctx.lastPerson,
        inferredLocation: ctx.lastLocation,
        isFollowUp: true
      };
    }

    return {
      resolvedQuery: utterance,
      isFollowUp: false
    };
  }
}


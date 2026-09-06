import { IntentType, RoutingDecision } from "./types.js";
import { ConversationContextManager } from "./conversationContext.js";
import { KnowledgeEngine } from "./knowledgeEngine.js";
import { SpokenNormalizer } from "./spokenNormalizer.js";

export class QueryRouter {
  public static route(
    conversationId: string,
    rawUtterance: string,
    language: "English" | "Hindi" | "Hindi + English" = "English"
  ): RoutingDecision {
    const text = SpokenNormalizer.normalize(rawUtterance);
    const lower = text.toLowerCase();
    const ctx = ConversationContextManager.get(conversationId);

    // Detect language if mixed or Hindi
    const hasHindiQuery =
      /[\u0900-\u097F]/.test(text) ||
      /\b(kya|hai|hain|kaun|kahan|batayein|batao|kaise|mein|nahi|haan|bataiye|bukhar|dawa|dawai|samay|mausam|aaj|kal|mujhe|aapka|karein|chahiye|galat|theek)\b/i.test(text);
    const effectiveLang: "English" | "Hindi" | "Hindi + English" =
      language.includes("Hindi") || hasHindiQuery ? (hasHindiQuery && /[a-zA-Z]/.test(text) ? "Hindi + English" : "Hindi") : "English";

    // 0. Resolve Follow-Ups & Elliptical Queries first using conversation context
    const followUp = ConversationContextManager.resolveFollowUp(conversationId, text);
    const resolvedText = followUp.resolvedQuery;
    const resolvedLower = resolvedText.toLowerCase();

    // 0.5 Explicit Language Switch Request (e.g. "Actually, Hindi mein batao")
    const isLanguageSwitch =
      /^(actually,?\s*)?(hindi mein batao|hindi me bolo|hindi me|explain in hindi|say it in hindi|english please|speak in english)\b/i.test(lower);

    if (isLanguageSwitch) {
      const targetLang: "English" | "Hindi" = lower.includes("hindi") ? "Hindi" : "English";
      ctx.languagePreference = targetLang;

      // If prior turn was NEWS and we have recent headlines, summarize them in Hindi!
      if (ctx.recentHeadlines && ctx.recentHeadlines.length > 0) {
        const h1 = ctx.recentHeadlines[0].title.replace(/\s*-\s*[^-]+$/, "").trim();
        const h2 = ctx.recentHeadlines[1] ? ctx.recentHeadlines[1].title.replace(/\s*-\s*[^-]+$/, "").trim() : "";
        const pub = ctx.recentHeadlines[0].publisher || "News Network";
        const hindiNews = h2
          ? `${pub} ki taaza khabar ke anusar: Pehli mukhya report, ${h1}. Iske sath hi, ${h2}.`
          : `${pub} ki taaza khabar ke anusar: ${h1}.`;

        return {
          intent: "NEWS",
          language: targetLang,
          requiresWeb: false,
          tool: "news",
          confidence: 0.98,
          requiresClarification: false,
          directAnswer: targetLang === "Hindi" ? hindiNews : `${pub} reports: ${h1}.`
        };
      }

      // If prior turn had a topic
      if (ctx.lastTopic) {
        const ans = KnowledgeEngine.answerQuery(ctx.lastTopic, { lastPerson: ctx.lastPerson, lastTopic: ctx.lastTopic });
        if (ans.hasAnswer) {
          return {
            intent: "FOLLOW_UP",
            language: targetLang,
            requiresWeb: false,
            tool: null,
            confidence: 0.96,
            requiresClarification: false,
            directAnswer: targetLang === "Hindi" ? ans.hindiAnswer : ans.englishAnswer
          };
        }
      }

      return {
        intent: "CASUAL_CONVERSATION",
        language: targetLang,
        requiresWeb: false,
        tool: null,
        confidence: 0.95,
        requiresClarification: false,
        directAnswer: targetLang === "Hindi"
          ? "Ji zaroor! Main Hindi me baat kar sakta hoon. Batayein main aapki kya sahayata kar sakta hoon?"
          : "Certainly! I will continue in English. How may I assist you?"
      };
    }

    // 1. Safety Sensitive (Chest pain, emergency medical, suicide, harm)
    if (
      lower.includes("chest pain") ||
      lower.includes("heart attack") ||
      lower.includes("cannot breathe") ||
      lower.includes("suicide") ||
      lower.includes("kill myself") ||
      lower.includes("stroke") ||
      lower.includes("emergency")
    ) {
      return {
        intent: "SAFETY_SENSITIVE",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        confidence: 0.99,
        safetyCategory: "emergency",
        requiresClarification: false
      };
    }

    // 1.5 Medical Treatment Request (e.g. "what medicine I can take for fever", "Mujhe fever hai, kya medicine le sakta hoon")
    const isMedTreatment =
      (lower.includes("medicine") || lower.includes("medication") || lower.includes("dawa") || lower.includes("dawai") || lower.includes("tablet") || lower.includes("dose")) &&
      (lower.includes("fever") || lower.includes("bukhar") || lower.includes("take") || lower.includes("le sakta") || lower.includes("kya lun") || lower.includes("kya lein") || lower.includes("prescribe"));

    if (isMedTreatment) {
      const ans = KnowledgeEngine.answerQuery(text);
      return {
        intent: "SAFETY_SENSITIVE",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        topic: "medical_treatment",
        safetyCategory: "medical_treatment",
        confidence: 0.99,
        requiresClarification: false,
        directAnswer: effectiveLang.includes("Hindi") ? ans.hindiAnswer : ans.englishAnswer
      };
    }

    // 2. Ambiguity Check (e.g. "can I get a number from someone I don't know", "tell me about Apple")
    const knowledgeCheck = KnowledgeEngine.answerQuery(resolvedText, {
      lastPerson: ctx.lastPerson,
      lastTopic: ctx.lastTopic
    });

    if (knowledgeCheck.isAmbiguous) {
      return {
        intent: "CLARIFICATION",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        topic: "ambiguous_query",
        confidence: 0.96,
        requiresClarification: true,
        clarificationPrompt: effectiveLang.includes("Hindi") ? knowledgeCheck.hindiClarificationPrompt : knowledgeCheck.clarificationPrompt,
        isAmbiguous: true
      };
    }

    // 2.5 Direct Knowledge Engine Answers (Capitals, Science, Physics, General Knowledge, Empathy, Comparisons)
    if (knowledgeCheck.hasAnswer) {
      let directIntent: IntentType = "GENERAL_KNOWLEDGE";
      if (knowledgeCheck.topic === "acknowledgement") directIntent = "ACKNOWLEDGEMENT";
      else if (knowledgeCheck.topic === "ai_identity") directIntent = "IDENTITY_QUESTION";
      else if (knowledgeCheck.topic === "interesting_fact") directIntent = "GENERAL_REQUEST";
      else if (knowledgeCheck.topic === "casual_greeting") directIntent = "CASUAL_CONVERSATION";
      else if (followUp.isFollowUp) directIntent = "FOLLOW_UP";

      return {
        intent: directIntent,
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        topic: knowledgeCheck.topic,
        confidence: 0.98,
        requiresClarification: false,
        directAnswer: effectiveLang.includes("Hindi") ? knowledgeCheck.hindiAnswer : knowledgeCheck.englishAnswer
      };
    }

    // 3. Task Request (Customer Support, Order tracking, Returns, Cancellations, Account, Human Handover)
    if (
      lower.includes("order") ||
      lower.includes("tracking") ||
      lower.includes("deliver") ||
      lower.includes("parcel") ||
      lower.includes("package") ||
      lower.includes("refund") ||
      lower.includes("return") ||
      lower.includes("supervisor") ||
      lower.includes("human agent") ||
      lower.includes("representative") ||
      lower.includes("mera naam") ||
      lower.includes("my name is") ||
      /\b\d{6}\b/.test(lower)
    ) {
      return {
        intent: "TASK_REQUEST",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        confidence: 0.95,
        requiresClarification: false
      };
    }

    // 4. Pure Greeting
    const isPureGreeting =
      /^(hello|hi|hey|namaste|pranam|good morning|good afternoon|good evening)\b[!.?]?$/i.test(lower) ||
      lower === "hello" || lower === "hi" || lower === "namaste";

    if (isPureGreeting) {
      return {
        intent: "GREETING",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        confidence: 0.98,
        requiresClarification: false,
        directAnswer: effectiveLang.includes("Hindi")
          ? "Namaste! Main VocaAI hoon. Aaj main aapki kya sahayata kar sakta hoon?"
          : "Hello! I'm VocaAI. How can I help you today?"
      };
    }

    // 5. Conversational Etiquette / Thanks / Closing
    if (
      /^(thank you|thanks|okay,? thanks|ok thanks|dhanyavaad|shukriya)\b[!.?]?$/i.test(lower) ||
      lower === "okay, thanks" || lower === "ok thanks" || lower === "thanks"
    ) {
      return {
        intent: "CASUAL_CONVERSATION",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        confidence: 0.97,
        requiresClarification: false,
        directAnswer: effectiveLang.includes("Hindi")
          ? "Aapka hardik swagat hai! Yadi aapko kisi anya vishay par sahayata chahiye to batayein."
          : "You're very welcome! Let me know if there's anything else I can assist you with."
      };
    }

    // 6. Casual Conversation check-ins: "What's up?", "How are you?"
    // (Must NOT trigger Donell Jones song or external search)
    const isCasualCheckIn =
      /^(what's up|whats up|what is up|sup|how are you|kaise ho|kya chal raha hai|sab kaisa hai)\b[!.?]?$/i.test(lower);

    const mentionsNews =
      lower.includes("news") ||
      lower.includes("khabar") ||
      lower.includes("samachar") ||
      lower.includes("headlines") ||
      lower.includes("kya chal raha") ||
      lower.includes("what's happening") ||
      lower.includes("what happening") ||
      lower.includes("whats happening") ||
      (lower.includes("apple") && (lower.includes("today") || lower.includes("happening") || lower.includes("doing")));

    if (isCasualCheckIn && !mentionsNews) {
      return {
        intent: "CASUAL_CONVERSATION",
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        confidence: 0.97,
        requiresClarification: false,
        directAnswer: effectiveLang.includes("Hindi") ? knowledgeCheck.hindiAnswer : knowledgeCheck.englishAnswer
      };
    }

    // 7. Weather (Including global locations, e.g. "Ohio, USA", "Gujarat", "Delhi")
    const isWeather =
      lower.includes("weather") ||
      lower.includes("mausam") ||
      lower.includes("temperature") ||
      lower.includes("taapman") ||
      lower.includes("rain") ||
      lower.includes("barish") ||
      followUp.inferredTopic === "current weather";

    if (isWeather) {
      // Extract location
      let loc = followUp.inferredLocation || ctx.lastLocation || "";
      let timeframe = followUp.inferredTimeframe || "now";

      if (lower.includes("tomorrow") || lower.includes("kal")) {
        timeframe = "tomorrow";
      } else if (lower.includes("today") || lower.includes("aaj") || lower.includes("right now") || lower.includes("abhi")) {
        timeframe = "now";
      }

      if (resolvedLower.includes("ohio usa") || resolvedLower.includes("ohio, usa") || resolvedLower.includes("ohio")) {
        loc = "Ohio, USA";
      } else if (resolvedLower.includes("gujarat")) {
        loc = "Gujarat";
      } else if (resolvedLower.includes("delhi")) {
        loc = "Delhi";
      } else if (resolvedLower.includes("mumbai")) {
        loc = "Mumbai";
      } else if (resolvedLower.includes("london")) {
        loc = "London";
      } else if (resolvedLower.includes("new york")) {
        loc = "New York";
      } else if (resolvedLower.includes("tokyo")) {
        loc = "Tokyo";
      } else {
        const inMatch = resolvedText.match(/(?:in|at|of|for)\s+([A-Za-z\s]+?)(?:\s+right now|\s+now|\s+today|\s+tomorrow|\?|$)/i);
        if (inMatch && inMatch[1]) {
          loc = inMatch[1].trim();
        }
      }

      if (!loc) loc = "Delhi";

      return {
        intent: "WEATHER",
        language: effectiveLang,
        requiresWeb: true,
        tool: "weather",
        topic: "current weather",
        location: loc,
        timeframe,
        searchQuery: `weather in ${loc} ${timeframe}`,
        confidence: 0.98,
        requiresClarification: false
      };
    }

    // 8. Current News & Real-Time Information
    if (mentionsNews) {
      let geoScope = "national";
      let querySubject = "latest news today";

      if (resolvedLower.includes("apple")) {
        geoScope = "Apple Inc.";
        querySubject = "Apple company news today";
      } else if (resolvedLower.includes("gujarat")) {
        geoScope = "Gujarat";
        querySubject = "latest Gujarat news today";
      } else if (resolvedLower.includes("india") || resolvedLower.includes("bharat")) {
        geoScope = "India";
        querySubject = "latest India news today";
      } else if (resolvedLower.includes("world") || resolvedLower.includes("international")) {
        geoScope = "World";
        querySubject = "latest world news today";
      } else if (resolvedLower.includes("mumbai") || resolvedLower.includes("delhi") || resolvedLower.includes("bangalore")) {
        const city = (resolvedLower.match(/(mumbai|delhi|bangalore)/i) || ["India"])[0];
        geoScope = city.charAt(0).toUpperCase() + city.slice(1);
        querySubject = `latest ${geoScope} news today`;
      }

      return {
        intent: "NEWS",
        language: effectiveLang,
        requiresWeb: true,
        tool: "news",
        topic: `${geoScope} news`,
        searchQuery: querySubject,
        confidence: 0.96,
        requiresClarification: false
      };
    }

    // 9. Knowledge Engine Answers (Capitals, Science, History, Figures, Sleep, Water shortage, DNS, Seasons, Trivia, Identity, Acknowledgement)
    if (knowledgeCheck.hasAnswer) {
      let directIntent: IntentType = "GENERAL_KNOWLEDGE";
      if (knowledgeCheck.topic === "acknowledgement") directIntent = "ACKNOWLEDGEMENT";
      else if (knowledgeCheck.topic === "ai_identity") directIntent = "IDENTITY_QUESTION";
      else if (knowledgeCheck.topic === "interesting_fact") directIntent = "GENERAL_REQUEST";
      else if (followUp.isFollowUp) directIntent = "FOLLOW_UP";

      return {
        intent: directIntent,
        language: effectiveLang,
        requiresWeb: false,
        tool: null,
        topic: knowledgeCheck.topic,
        confidence: 0.98,
        requiresClarification: false,
        directAnswer: effectiveLang.includes("Hindi") ? knowledgeCheck.hindiAnswer : knowledgeCheck.englishAnswer
      };
    }

    // 10. Sports & Current Sports Events (Cricket, Football, F1, IPL)
    const isSportsQuery =
      lower.includes("cricket") ||
      lower.includes("football") ||
      lower.includes("ipl") ||
      lower.includes("f1") ||
      lower.includes("formula 1") ||
      lower.includes("match") ||
      lower.includes("score") ||
      lower.includes("tournament") ||
      lower.includes("world cup") ||
      lower.includes("virat kohli") ||
      lower.includes("rohit sharma");

    if (isSportsQuery) {
      const isCurrentTimeframe =
        lower.includes("today") ||
        lower.includes("aaj") ||
        lower.includes("yesterday") ||
        lower.includes("kal") ||
        lower.includes("happened") ||
        lower.includes("hua") ||
        lower.includes("score") ||
        lower.includes("news") ||
        lower.includes("live") ||
        lower.includes("update") ||
        lower.includes("play");

      return {
        intent: "SPORTS",
        language: effectiveLang,
        requiresWeb: true,
        tool: "sports",
        topic: lower.includes("cricket") ? "cricket" : "sports",
        timeframe: isCurrentTimeframe ? "today" : undefined,
        searchQuery: text,
        confidence: 0.95,
        requiresClarification: false
      };
    }

    // Default: General Knowledge with no web requirement
    return {
      intent: "GENERAL_KNOWLEDGE",
      language: effectiveLang,
      requiresWeb: false,
      tool: null,
      topic: text,
      confidence: 0.75,
      requiresClarification: false
    };
  }
}

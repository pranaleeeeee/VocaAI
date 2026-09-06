import { StateManager, ActiveConversation } from "./stateManager.js";
import { EntityExtractor } from "./entityExtractor.js";
import { ConfirmationManager } from "./confirmationManager.js";
import { ConfidenceEvaluator } from "./confidenceEvaluator.js";
import { PrioritizedFlow } from "./prioritizedFlow.js";
import { Guardrails } from "../safety/guardrails.js";
import { createCase, logMessage, addCaseEvent, getCaseEvents } from "../db/database.js";
import { StructuredAction, CaseRecord, ConversationState } from "../types/serverTypes.js";
import { WebSourceItem } from "../intelligence/webSearchEngine.js";
import { ConversationContextManager } from "../intelligence/conversationContext.js";
import { SpokenNormalizer } from "../intelligence/spokenNormalizer.js";

export interface TurnResult {
  conversationId: string;
  state: ConversationState;
  reply: string;
  action: StructuredAction;
  confidence: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  language: "English" | "Hindi" | "Hindi + English";
  intent?: string;
  entities: ActiveConversation["entities"];
  isInterrupted: boolean;
  ticket?: CaseRecord;
  escalationSummary?: string;
  sources?: WebSourceItem[];
}

export class ConversationOrchestrator {
  public static generateTicketId(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TKT-${year}-${random}`;
  }

  public static formatConfirmedInfo(entities: ActiveConversation["entities"]): string {
    const list: string[] = [];
    if (entities.customer_name?.confirmed) list.push(`Customer Name: ${entities.customer_name.value}`);
    if (entities.customer_phone?.confirmed) list.push(`Contact Phone: ${entities.customer_phone.value}`);
    if (entities.reference_id?.confirmed) list.push(`Reference ID: ${entities.reference_id.value}`);
    else if (entities.order_id?.confirmed) list.push(`Reference / Order ID: ${entities.order_id.value}`);
    if (entities.payment_status?.confirmed) list.push(`Payment Status: ${entities.payment_status.value}`);
    return list.length > 0 ? list.join(", ") : "None verified yet";
  }

  public static formatUnconfirmedInfo(entities: ActiveConversation["entities"]): string {
    const list: string[] = [];
    if (entities.reference_id && !entities.reference_id.confirmed) list.push(`Reference ID (${entities.reference_id.value}) pending verification`);
    else if (entities.order_id && !entities.order_id.confirmed) list.push(`Reference ID (${entities.order_id.value}) pending verification`);
    if (entities.transaction_ref && !entities.transaction_ref.confirmed) list.push(`Transaction Ref (${entities.transaction_ref.value}) unverified`);
    return list.length > 0 ? list.join(", ") : "No pending unconfirmed items";
  }

  public static formatMissingInfo(entities: ActiveConversation["entities"]): string {
    const list: string[] = [];
    if (!entities.customer_phone) list.push("Customer contact phone");
    if (!entities.reference_id && !entities.order_id) list.push("Reference or account identifier");
    return list.length > 0 ? list.join(", ") : "All core fields captured";
  }

  public static generateHandoffBrief(conv: ActiveConversation, text: string, reason: string): string {
    const customerReq = text.length > 3 ? text : (conv.intent?.value || "Customer Assistance Request");
    const confirmed = this.formatConfirmedInfo(conv.entities);
    const unconfirmed = this.formatUnconfirmedInfo(conv.entities);
    const missing = this.formatMissingInfo(conv.entities);

    const attempts = conv.consecutiveLowConfidenceCount > 0
      ? `Clarification attempted ${conv.consecutiveLowConfidenceCount} time(s) due to acoustic uncertainty`
      : `Intent classified as ${conv.intent?.value || "General Support"}, context preserved`;

    const nextStep = (conv.entities.reference_id?.value || conv.entities.order_id?.value)
      ? `Verify reference #${conv.entities.reference_id?.value || conv.entities.order_id?.value} with caller and resolve request directly.`
      : `Greet caller, reference inquiry regarding "${customerReq.slice(0, 50)}", and provide direct assistance.`;

    return `AI HANDOFF BRIEF

Customer request:
"${customerReq}"

What we know:
• ${confirmed}

What remains unresolved:
• ${unconfirmed}
• Missing: ${missing}

What AI attempted:
• ${attempts}

Why escalation occurred:
• ${reason}

Recommended next step:
• ${nextStep}

Language:
${conv.language}`;
  }

  public static async processTurn(
    conversationId: string,
    callerUtterance: string,
    callerInterrupted: boolean = false
  ): Promise<TurnResult> {
    const conv = StateManager.getOrCreate(conversationId);
    conv.turnCount++;

    const now = new Date().toISOString();
    const rawTranscript = callerUtterance.trim();
    const text = SpokenNormalizer.normalize(rawTranscript);

    // Turn-level structured log for diagnostics
    console.log(`[TURN #${conv.turnCount}] SESSION: ${conversationId} | RAW: "${rawTranscript}" | NORM: "${text}" | LANG: ${conv.language}`);

    // Record turn in conversational context manager
    ConversationContextManager.recordTurn(conversationId, "user", rawTranscript);

    // 1. Log incoming user message
    await logMessage({
      conversation_id: conversationId,
      role: "user",
      content: rawTranscript,
      timestamp: now,
      language: conv.language,
      confidence: conv.overallConfidence
    });

    // 2. Automatic Barge-In handling
    let wasInterrupted = callerInterrupted || conv.isAiSpeaking;
    if (wasInterrupted) {
      conv.state = "COLLECTING_INFORMATION";
      StateManager.setAiSpeaking(conversationId, false);
    }

    try {

    // 3. Dedicated Safety Guardrail Check
    const safetyCheck = Guardrails.checkSafety(text);
    if (safetyCheck.triggered) {
      conv.state = "ESCALATING";
      conv.requiresHuman = true;
      conv.escalationReason = safetyCheck.reason || "Safety Policy Boundary Triggered";

      const ticketId = this.generateTicketId();
      conv.ticketId = ticketId;

      const summary = `SAFETY ESCALATION: ${safetyCheck.reason}. Caller stated: "${text}". Transferred to emergency/human supervisor desk with full context.`;

      const createdCase = await createCase({
        ticket_id: ticketId,
        created_at: now,
        updated_at: now,
        status: "Escalated",
        priority: safetyCheck.priority || "HIGH",
        language: conv.language,
        issue_type: safetyCheck.type || "safety_escalation",
        customer_name: conv.entities.customer_name?.value || null,
        customer_phone: conv.entities.customer_phone?.value || null,
        order_id: conv.entities.order_id?.value || null,
        reference_id: conv.entities.reference_id?.value || conv.entities.order_id?.value || null,
        description: text,
        summary,
        escalation_reason: safetyCheck.reason,
        confidence: 0.95,
        transcript: JSON.stringify([{ speaker: "user", text }, { speaker: "agent", text: safetyCheck.responseText }]),
        handoff_brief: this.generateHandoffBrief(conv, text, safetyCheck.reason || "Safety Concern"),
        confirmed_info: this.formatConfirmedInfo(conv.entities),
        unconfirmed_info: this.formatUnconfirmedInfo(conv.entities),
        missing_info: this.formatMissingInfo(conv.entities)
      });

      const reply = safetyCheck.responseText || "Connecting you to a human supervisor.";

      await logMessage({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        confidence: 0.95
      });

      conv.state = "TICKET_CREATED";

      return {
        conversationId,
        state: conv.state,
        reply,
        action: {
          action: "REFUSE",
          message: reply,
          escalationReason: safetyCheck.reason,
          priority: safetyCheck.priority
        },
        confidence: 0.95,
        confidenceLevel: "HIGH",
        language: conv.language,
        entities: conv.entities,
        isInterrupted: wasInterrupted,
        ticket: createdCase,
        escalationSummary: summary
      };
    }

    // 4. Intent & Entity Extraction
    const extraction = EntityExtractor.extract(text, conv.entities);
    conv.language = extraction.language;
    if (extraction.intent.confidence > conv.intent.confidence || conv.intent.value === "general_inquiry") {
      conv.intent = extraction.intent;
    }

    // Handle User Correction (e.g. "No, it's 458291")
    if (extraction.isCorrection && extraction.correctedField && extraction.entities[extraction.correctedField]) {
      const field = extraction.correctedField;
      const newVal = extraction.entities[field]!.value;
      ConfirmationManager.applyCorrection(conv.entities, field, newVal);
      conv.fieldAwaitingConfirmation = field;
      conv.state = "CONFIRMING";

      const reply = conv.language.includes("Hindi")
        ? `Sahi vivaran darj kar liya gaya hai: maine order ID sanshodhit karke ${newVal} kar diya hai. Pusthi hetu kripya confirm karein, kya ${newVal} sahi hai?`
        : `Acknowledged. I have updated the record to reference ${newVal}. For precision, could you verify that ${newVal} is correct?`;

      await logMessage({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString()
      });

      return {
        conversationId,
        state: conv.state,
        reply,
        action: { action: "CONFIRM", message: reply, fieldToConfirm: field },
        confidence: 0.94,
        confidenceLevel: "HIGH",
        language: conv.language,
        entities: conv.entities,
        isInterrupted: wasInterrupted
      };
    }

    // Merge newly extracted entities
    for (const [key, entity] of Object.entries(extraction.entities)) {
      const fieldKey = key as keyof typeof conv.entities;
      if (entity && (!conv.entities[fieldKey] || !conv.entities[fieldKey]?.confirmed)) {
        conv.entities[fieldKey] = entity;
      }
    }

    // 5. Check Confirmation of field awaiting confirmation
    if (conv.fieldAwaitingConfirmation && conv.entities[conv.fieldAwaitingConfirmation]) {
      if (ConfirmationManager.isAffirmative(text)) {
        ConfirmationManager.confirmField(conv.entities, conv.fieldAwaitingConfirmation);
        const confirmedField = conv.fieldAwaitingConfirmation;
        conv.fieldAwaitingConfirmation = undefined;
        conv.state = "COLLECTING_INFORMATION";
      } else if (ConfirmationManager.isNegative(text)) {
        // Rejected without new value
        conv.entities[conv.fieldAwaitingConfirmation]!.confirmed = false;
      }
    }

    // 6. Explicit Request for Human Support
    const lower = text.toLowerCase();
    if (
      lower.includes("human") ||
      lower.includes("agent") ||
      lower.includes("representative") ||
      lower.includes("supervisor") ||
      lower.includes("transfer") ||
      lower.includes("insan")
    ) {
      conv.state = "ESCALATING";
      conv.requiresHuman = true;
      conv.escalationReason = "Direct customer request for human supervisor";

      const ticketId = this.generateTicketId();
      conv.ticketId = ticketId;

      const summary = `Customer requested human support. Issue: ${conv.intent.value}. Order ID: ${conv.entities.order_id?.value || "N/A"}. Handed over with context.`;

      const createdCase = await createCase({
        ticket_id: ticketId,
        created_at: now,
        updated_at: now,
        status: "Escalated",
        priority: "MEDIUM",
        language: conv.language,
        issue_type: conv.intent.value,
        customer_name: conv.entities.customer_name?.value || null,
        customer_phone: conv.entities.customer_phone?.value || null,
        order_id: conv.entities.order_id?.value || null,
        reference_id: conv.entities.reference_id?.value || conv.entities.order_id?.value || null,
        description: text,
        summary,
        escalation_reason: conv.escalationReason,
        confidence: 0.90,
        transcript: JSON.stringify([{ speaker: "user", text }]),
        handoff_brief: this.generateHandoffBrief(conv, text, conv.escalationReason),
        confirmed_info: this.formatConfirmedInfo(conv.entities),
        unconfirmed_info: this.formatUnconfirmedInfo(conv.entities),
        missing_info: this.formatMissingInfo(conv.entities)
      });

      const reply = conv.language.includes("Hindi")
        ? `Nishchint rahein. Main aapke pramanit vivaran ke sath case #${ticketId} darj karke session varishtha human supervisor ko transfer kar raha hoon.`
        : `Certainly. I have compiled your verified conversational dossier under case #${ticketId} and am transferring your session to a human supervisor.`;

      await logMessage({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString()
      });

      conv.state = "TICKET_CREATED";

      return {
        conversationId,
        state: conv.state,
        reply,
        action: { action: "ESCALATE", message: reply, escalationReason: conv.escalationReason },
        confidence: 0.90,
        confidenceLevel: "HIGH",
        language: conv.language,
        entities: conv.entities,
        isInterrupted: wasInterrupted,
        ticket: createdCase,
        escalationSummary: summary
      };
    }

    // 7. Deterministic Confidence Evaluation
    const confEval = ConfidenceEvaluator.evaluate(
      text,
      conv.intent.confidence,
      conv.entities,
      conv.consecutiveLowConfidenceCount,
      extraction.isGarbledOrUnclear
    );

    conv.overallConfidence = confEval.overall;
    conv.consecutiveLowConfidenceCount = confEval.consecutiveLowCount;

    if (confEval.requiresEscalation) {
      conv.state = "ESCALATING";
      conv.requiresHuman = true;
      conv.escalationReason = "Low acoustic confidence: detail clarification needed";

      const ticketId = this.generateTicketId();
      conv.ticketId = ticketId;

      const summary = `CUSTOMER SUPPORT ESCALATION\nTicket: ${ticketId}\nLanguage: ${conv.language}\nIssue: ${conv.intent.value}\nOrder ID: ${conv.entities.order_id?.value || "Unresolved"}\nReason: ${conv.escalationReason}`;

      const createdCase = await createCase({
        ticket_id: ticketId,
        created_at: now,
        updated_at: now,
        status: "Escalated",
        priority: "MEDIUM",
        language: conv.language,
        issue_type: conv.intent.value,
        customer_name: conv.entities.customer_name?.value || null,
        customer_phone: conv.entities.customer_phone?.value || null,
        order_id: conv.entities.order_id?.value || null,
        reference_id: conv.entities.reference_id?.value || conv.entities.order_id?.value || null,
        description: text,
        summary,
        escalation_reason: conv.escalationReason,
        confidence: confEval.overall,
        transcript: JSON.stringify([{ speaker: "user", text }]),
        handoff_brief: this.generateHandoffBrief(conv, text, conv.escalationReason),
        confirmed_info: this.formatConfirmedInfo(conv.entities),
        unconfirmed_info: this.formatUnconfirmedInfo(conv.entities),
        missing_info: this.formatMissingInfo(conv.entities)
      });

      const reply = conv.language.includes("Hindi")
        ? `Aawaz me aspashtata ke kaaran galati se bachne hetu main bina kisi vilamb ke aapko senior human supervisor se jod raha hoon. Case #${ticketId} darj ho gaya hai.`
        : `To preserve data integrity and eliminate transcription error, I am establishing a priority transfer to a human supervisor under case #${ticketId}.`;

      await logMessage({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        confidence: confEval.overall
      });

      conv.state = "TICKET_CREATED";

      return {
        conversationId,
        state: conv.state,
        reply,
        action: { action: "ESCALATE", message: reply, escalationReason: conv.escalationReason },
        confidence: confEval.overall,
        confidenceLevel: confEval.level,
        language: conv.language,
        intent: conv.intent?.value || "GENERAL_SUPPORT",
        entities: conv.entities,
        isInterrupted: wasInterrupted,
        ticket: createdCase,
        escalationSummary: summary
      };
    }

    if (confEval.requiresClarification) {
      conv.state = "CLARIFYING";
      const reply = conv.language.includes("Hindi")
        ? "Prishthbhoomi me shor ke kaaran aawaz aspasht thi. Kripya apna reference sankhya ya order vivaran punah dohraayein."
        : "Due to ambient acoustic interference, I could not parse that distinctly. Could you please state the numerical reference identifier or order detail?";

      await logMessage({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        confidence: confEval.overall
      });

      return {
        conversationId,
        state: conv.state,
        reply,
        action: { action: "CLARIFY", message: reply },
        confidence: confEval.overall,
        confidenceLevel: confEval.level,
        language: conv.language,
        intent: conv.intent?.value || "GENERAL_SUPPORT",
        entities: conv.entities,
        isInterrupted: wasInterrupted
      };
    }

    // 8. Prioritized Question Flow (Determines next step without re-asking known info)
    const nextStep = await PrioritizedFlow.determineNextStep(conv.intent.value, conv.entities, conv.language, text, conversationId);

    let reply = nextStep.prompt;
    if (conv.language.includes("Hindi") && nextStep.hindiPrompt) {
      reply = nextStep.hindiPrompt;
    }

    if (nextStep.type === "CONFIRM_FIELD" && nextStep.field) {
      conv.state = "CONFIRMING";
      conv.fieldAwaitingConfirmation = nextStep.field;
    } else if (nextStep.type === "ASK_MISSING") {
      conv.state = "COLLECTING_INFORMATION";
    } else if (nextStep.type === "RESOLVE") {
      conv.state = "RESOLVING";
    } else if (nextStep.type === "ANSWER" || nextStep.type === "CLARIFY") {
      conv.state = "COLLECTING_INFORMATION";
    }

    await logMessage({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
      confidence: confEval.overall
    });

      return {
        conversationId,
        state: conv.state,
        reply,
        action: {
          action: nextStep.type === "CONFIRM_FIELD" ? "CONFIRM" : nextStep.type === "ASK_MISSING" ? "ASK_QUESTION" : nextStep.type === "CLARIFY" ? "CLARIFY" : "ANSWER",
          message: reply,
          fieldToConfirm: nextStep.field
        },
        confidence: confEval.overall,
        confidenceLevel: confEval.level,
        language: conv.language,
        intent: conv.intent?.value || "general_inquiry",
        entities: conv.entities,
        isInterrupted: wasInterrupted,
        sources: nextStep.sources
      };
    } catch (turnErr: any) {
      console.error(`[TURN #${conv.turnCount} ERROR] Session: ${conversationId}:`, turnErr);
      const fallbackReply = conv.language.includes("Hindi")
        ? "Main abhi yeh jaankari prapt nahi kar paaya, par main aapki sahayata ke liye yahan hoon. Kya main kisi aur vishay me madad karoon?"
        : "I couldn't complete that request right now, but I'm here to help. What else can I assist you with?";

      conv.state = "COLLECTING_INFORMATION";
      return {
        conversationId,
        state: conv.state,
        reply: fallbackReply,
        action: { action: "ANSWER", message: fallbackReply },
        confidence: 0.85,
        confidenceLevel: "MEDIUM",
        language: conv.language,
        intent: conv.intent?.value || "general_inquiry",
        entities: conv.entities,
        isInterrupted: wasInterrupted
      };
    } finally {
      StateManager.setAiSpeaking(conversationId, false);
      conv.isAiSpeaking = false;
    }
  }
}

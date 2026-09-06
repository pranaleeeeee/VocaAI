import { ConversationState, ConversationEntities, EntityValue } from "../types/serverTypes.js";
import { ConversationContextManager } from "../intelligence/conversationContext.js";

export interface ActiveConversation {
  conversationId: string;
  createdAt: string;
  mode: "LIVE" | "DEMO";
  state: ConversationState;
  language: "English" | "Hindi" | "Hindi + English";
  intent: {
    value: string;
    confidence: number;
  };
  entities: ConversationEntities;
  lastQuestionAsked?: string;
  fieldAwaitingConfirmation?: keyof ConversationEntities;
  consecutiveLowConfidenceCount: number;
  overallConfidence: number;
  requiresHuman: boolean;
  escalationReason: string | null;
  ticketId: string | null;
  turnCount: number;
  isAiSpeaking: boolean;
}

export class StateManager {
  private static conversations: Map<string, ActiveConversation> = new Map();

  public static getOrCreate(conversationId: string, mode: "LIVE" | "DEMO" = "DEMO"): ActiveConversation {
    let conv = this.conversations.get(conversationId);
    if (!conv) {
      conv = {
        conversationId,
        createdAt: new Date().toISOString(),
        mode,
        state: "GREETING",
        language: "English",
        intent: {
          value: "general_inquiry",
          confidence: 0.90
        },
        entities: {},
        consecutiveLowConfidenceCount: 0,
        overallConfidence: 0.92,
        requiresHuman: false,
        escalationReason: null,
        ticketId: null,
        turnCount: 0,
        isAiSpeaking: false
      };
      this.conversations.set(conversationId, conv);
    }
    return conv;
  }

  public static get(conversationId: string): ActiveConversation | undefined {
    return this.conversations.get(conversationId);
  }

  public static updateState(conversationId: string, newState: ConversationState): void {
    const conv = this.get(conversationId);
    if (conv) {
      conv.state = newState;
    }
  }

  public static setAiSpeaking(conversationId: string, speaking: boolean): void {
    const conv = this.get(conversationId);
    if (conv) {
      conv.isAiSpeaking = speaking;
      if (speaking) {
        // state remains while speaking
      }
    }
  }

  public static reset(conversationId: string): ActiveConversation {
    this.conversations.delete(conversationId);
    ConversationContextManager.reset(conversationId);
    return this.getOrCreate(conversationId);
  }
}

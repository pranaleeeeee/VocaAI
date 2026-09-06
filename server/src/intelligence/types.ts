export type IntentType =
  | "GREETING"
  | "ACKNOWLEDGEMENT"
  | "IDENTITY_QUESTION"
  | "GENERAL_REQUEST"
  | "CASUAL_CONVERSATION"
  | "GENERAL_KNOWLEDGE"
  | "CURRENT_INFORMATION"
  | "NEWS"
  | "WEATHER"
  | "SPORTS"
  | "FOLLOW_UP"
  | "CLARIFICATION"
  | "TASK_REQUEST"
  | "SAFETY_SENSITIVE"
  | "OUT_OF_SCOPE"
  | "UNKNOWN";

export interface RoutingDecision {
  intent: IntentType;
  language: "English" | "Hindi" | "Hindi + English";
  requiresWeb: boolean;
  tool: "weather" | "news" | "sports" | null;
  topic?: string;
  subtopic?: string;
  searchQuery?: string | null;
  confidence: number;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  safetyCategory?: "medical_treatment" | "emergency" | "harm" | "none";
  location?: string;
  timeframe?: string;
  directAnswer?: string;
  isAmbiguous?: boolean;
}

export interface ConversationHistoryTurn {
  role: "user" | "assistant";
  content: string;
  intent?: IntentType;
  topic?: string;
  location?: string;
  timeframe?: string;
  sources?: any[];
}


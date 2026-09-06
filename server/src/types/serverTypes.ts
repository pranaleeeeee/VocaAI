export type ConversationState =
  | "IDLE"
  | "CONNECTING"
  | "GREETING"
  | "IDENTIFYING_INTENT"
  | "COLLECTING_INFORMATION"
  | "CONFIRMING"
  | "RESOLVING"
  | "CLARIFYING"
  | "ESCALATING"
  | "TICKET_CREATED"
  | "HUMAN_HANDOFF"
  | "COMPLETED";

export type StructuredActionType =
  | "ANSWER"
  | "ASK_QUESTION"
  | "CONFIRM"
  | "CLARIFY"
  | "ESCALATE"
  | "REFUSE";

export interface EntityValue {
  value: string;
  confirmed: boolean;
  confidence: number;
  timestamp?: string;
  source?: string;
  sourceTurnId?: string;
  confirmationStatus?: "explicit" | "inferred" | "unconfirmed" | "superseded";
}

export interface ConversationEntities {
  customer_name?: EntityValue;
  customer_phone?: EntityValue;
  order_id?: EntityValue;
  reference_id?: EntityValue;
  service_type?: EntityValue;
  transaction_ref?: EntityValue;
  payment_status?: EntityValue;
  issue_description?: EntityValue;
}

export interface StructuredAction {
  action: StructuredActionType;
  message: string;
  fieldToConfirm?: string;
  entities?: Partial<ConversationEntities>;
  targetQuestion?: string;
  clarificationReason?: string;
  escalationReason?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}

export interface CaseRecord {
  id?: number;
  ticket_id: string;
  created_at: string;
  updated_at: string;
  status: "Open" | "AI Handling" | "Waiting for Customer" | "Escalated" | "Human Handling" | "Resolved" | "Closed";
  priority: "LOW" | "MEDIUM" | "HIGH";
  language: string;
  issue_type: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  order_id?: string | null;
  reference_id?: string | null;
  service_type?: string | null;
  description?: string | null;
  summary: string;
  escalation_reason?: string | null;
  confidence: number;
  transcript: string; // JSON string
  resolution_note?: string | null;
  handoff_brief?: string | null;
  confirmed_info?: string | null;
  unconfirmed_info?: string | null;
  missing_info?: string | null;
}

export interface CaseEvent {
  id?: number;
  case_id: number;
  ticket_id: string;
  event_type: string;
  description: string;
  timestamp: string;
  metadata?: string;
}

export interface MessageRecord {
  id?: number;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  language?: string;
  confidence?: number;
}

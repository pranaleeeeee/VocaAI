export interface EntityValue {
  value: string;
  confirmed: boolean;
  confidence: number;
  timestamp?: string;
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
  transcript: string;
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

export interface WebSourceItem {
  title: string;
  publisher?: string;
  url?: string;
  time?: string;
}

export interface TurnResult {
  conversationId: string;
  state: string;
  reply: string;
  action: {
    action: string;
    message: string;
    fieldToConfirm?: string;
  };
  confidence: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  language: "English" | "Hindi" | "Hindi + English";
  intent?: string;
  entities: ConversationEntities;
  isInterrupted: boolean;
  ticket?: CaseRecord;
  escalationSummary?: string;
  sources?: WebSourceItem[];
}

export interface AgoraSessionInfo {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  mode: "LIVE" | "DEMO";
  providers: {
    stt: string;
    llm: string;
    tts: string;
  };
  agentStatus: "IDLE" | "CONNECTING" | "ACTIVE" | "DEMO";
  message?: string;
}

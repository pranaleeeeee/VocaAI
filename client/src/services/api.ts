import { CaseRecord, CaseEvent, TurnResult, AgoraSessionInfo } from "../types/index.js";

// Automatically use current origin or localhost:5000 if running from standalone Vite dev port
const BASE_URL = typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000")
  ? "" // Vite proxy forwards /api to http://127.0.0.1:5000
  : "";

export const api = {
  async getHealth() {
    const res = await fetch(`${BASE_URL}/api/health`);
    return res.json();
  },

  async getAgoraSession(conversationId: string, mode?: "LIVE" | "DEMO"): Promise<AgoraSessionInfo> {
    const res = await fetch(`${BASE_URL}/api/agora/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, mode })
    });
    return res.json();
  },

  async getAgoraDoctor() {
    const res = await fetch(`${BASE_URL}/api/agora/doctor`);
    return res.json();
  },

  async sendTurn(conversationId: string, utterance: string, interrupted: boolean = false): Promise<TurnResult> {
    const res = await fetch(`${BASE_URL}/api/conversation/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, utterance, interrupted }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || `Turn failed with status ${res.status}`);
    }
    return res.json();
  },

  async bargeIn(conversationId: string) {
    const res = await fetch(`${BASE_URL}/api/conversation/barge-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId })
    });
    return res.json();
  },

  async resetConversation(conversationId: string) {
    const res = await fetch(`${BASE_URL}/api/conversation/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId })
    });
    return res.json();
  },

  async getCases(): Promise<{ cases: CaseRecord[] }> {
    const res = await fetch(`${BASE_URL}/api/cases`);
    return res.json();
  },

  async getCaseDetail(ticketId: string): Promise<{ case: CaseRecord; timeline: CaseEvent[] }> {
    const res = await fetch(`${BASE_URL}/api/cases/${ticketId}`);
    return res.json();
  },

  async updateCase(ticketId: string, status: CaseRecord["status"], resolutionNote?: string) {
    const res = await fetch(`${BASE_URL}/api/cases/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolutionNote })
    });
    return res.json();
  }
};

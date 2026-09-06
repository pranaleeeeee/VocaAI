import { CaseRecord, CaseEvent, TurnResult, AgoraSessionInfo } from "../types/index.js";

// Automatically use VITE_API_URL, VITE_API_BASE_URL, or current origin
const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, "");
    }
  }
  return "";
};

const BASE_URL = getBaseUrl();

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
      signal: AbortSignal.timeout(15000)
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

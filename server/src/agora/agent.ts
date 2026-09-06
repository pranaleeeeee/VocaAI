import { AgoraTokenService } from "./token.js";
import { AgoraCli } from "./cli.js";

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

export class AgoraAgentManager {
  private static activeSessions: Map<string, AgoraSessionInfo> = new Map();

  /**
   * Starts or joins an Agora Conversational AI session for a given conversation.
   */
  public static async createSession(conversationId: string, requestedMode?: "LIVE" | "DEMO"): Promise<AgoraSessionInfo> {
    const appId = process.env.AGORA_APP_ID || "18cf22213298492aba589f8c0e20b386";
    const channel = `voca_${conversationId.slice(0, 8)}`;
    const uid = Math.floor(Math.random() * 899999) + 100000;

    // Check if CLI is authenticated & real credentials configured
    let isLiveCapable = false;
    try {
      const auth = await AgoraCli.checkAuth();
      isLiveCapable = auth.authenticated && !!process.env.AGORA_APP_CERTIFICATE;
    } catch (e) {
      isLiveCapable = false;
    }

    const mode = (requestedMode === "LIVE" && isLiveCapable) ? "LIVE" : (isLiveCapable ? "LIVE" : "DEMO");

    const token = AgoraTokenService.generateRtcToken({
      channelName: channel,
      uid: uid,
      role: "publisher",
      expireSeconds: 7200
    });

    const sessionInfo: AgoraSessionInfo = {
      appId,
      channel,
      token,
      uid,
      mode,
      providers: {
        stt: "Deepgram Nova-2 (Multilingual en/hi)",
        llm: "OpenAI GPT-4o Support Agent",
        tts: "MiniMax / Edge-TTS Neural"
      },
      agentStatus: mode === "LIVE" ? "ACTIVE" : "DEMO",
      message: mode === "LIVE" 
        ? "Connected to real Agora RTC & ConvoAI channel."
        : "DEMO MODE — Running local evaluation audio fallback."
    };

    this.activeSessions.set(conversationId, sessionInfo);
    return sessionInfo;
  }

  public static getSession(conversationId: string): AgoraSessionInfo | undefined {
    return this.activeSessions.get(conversationId);
  }

  public static endSession(conversationId: string): boolean {
    return this.activeSessions.delete(conversationId);
  }
}

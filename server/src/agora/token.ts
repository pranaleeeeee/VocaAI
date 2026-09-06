import pkg from "agora-token";
const { RtcTokenBuilder, RtcRole, ConvoAITokenBuilder } = pkg;

export interface TokenRequestParams {
  channelName: string;
  uid: number | string;
  role?: "publisher" | "subscriber";
  expireSeconds?: number;
}

export class AgoraTokenService {
  private static getCredentials(): { appId: string; appCertificate: string } {
    const appId = process.env.AGORA_APP_ID || "18cf22213298492aba589f8c0e20b386";
    const appCertificate = process.env.AGORA_APP_CERTIFICATE || "7b526678cdbf4620809333a91f2be2a7";
    return { appId, appCertificate };
  }

  /**
   * Generates a standard RTC token for audio/video client connection.
   */
  public static generateRtcToken(params: TokenRequestParams): string {
    const { appId, appCertificate } = this.getCredentials();
    const role = params.role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const expirationTimeInSeconds = params.expireSeconds || 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    if (typeof params.uid === "number") {
      return RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        params.channelName,
        params.uid,
        role,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
    } else {
      return RtcTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCertificate,
        params.channelName,
        params.uid,
        role,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
    }
  }

  /**
   * Generates official Agora ConvoAI token (with ServiceRtc, ServiceRtm, and ServiceConvoAI).
   */
  public static generateConvoAiToken(channelName: string, account: string = "user"): string {
    const { appId, appCertificate } = this.getCredentials();
    const expire = 3600;
    try {
      return ConvoAITokenBuilder.buildToken(
        appId,
        appCertificate,
        channelName,
        account,
        RtcRole.PUBLISHER,
        expire,
        expire,
        expire,
        expire,
        expire,
        account,
        expire
      );
    } catch (e) {
      // Fallback to standard RTC token
      return this.generateRtcToken({ channelName, uid: account, role: "publisher" });
    }
  }
}

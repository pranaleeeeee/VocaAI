import { Router } from "express";
import { AgoraAgentManager } from "../agora/agent.js";
import { AgoraCli } from "../agora/cli.js";

export const agoraRoutes = Router();

agoraRoutes.post("/session", async (req, res) => {
  try {
    const { conversationId = `conv_${Date.now()}`, mode } = req.body || {};
    const session = await AgoraAgentManager.createSession(conversationId, mode);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agoraRoutes.get("/doctor", async (_req, res) => {
  try {
    const auth = await AgoraCli.checkAuth();
    const diagnosis = await AgoraCli.diagnoseProject();
    const version = await AgoraCli.getVersion().catch(() => "Not installed");
    res.json({
      cliInstalled: !version.includes("Not installed"),
      version,
      auth,
      convoAiDiagnosis: diagnosis
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

agoraRoutes.get("/version", async (_req, res) => {
  try {
    const version = await AgoraCli.getVersion();
    res.json({ version });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

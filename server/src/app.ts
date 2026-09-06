import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { agoraRoutes } from "./routes/agoraRoutes.js";
import { conversationRoutes } from "./routes/conversationRoutes.js";
import { caseRoutes } from "./routes/caseRoutes.js";
import { getDb } from "./db/database.js";
import { AgoraCli } from "./agora/cli.js";

dotenv.config();

export const app = express();

// Enable CORS for all origins (or deployed Vercel domains)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(express.json());

// API Routes - Clean Agora Conversational AI, Voice Agent & Cases
app.use("/api/agora", agoraRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/cases", caseRoutes);

// Health Check
app.get("/api/health", async (_req, res) => {
  let agoraCliVersion = "Not detected";
  let agoraAuth = false;
  try {
    agoraCliVersion = await AgoraCli.getVersion();
    const authStatus = await AgoraCli.checkAuth();
    agoraAuth = authStatus.authenticated;
  } catch (e) {}

  res.json({
    status: "healthy",
    service: "VocaAI Studio Voice Assistant Server",
    database: "SQLite (vocaai.sqlite / in-memory active)",
    agora: {
      cliVersion: agoraCliVersion,
      authenticated: agoraAuth,
      appIdConfigured: !!process.env.AGORA_APP_ID || true
    },
    capabilities: {
      convoAiStateOrchestrator: true,
      deterministicConfidence: true,
      strictSafetyGuardrails: true,
      caseManagementTimeline: true
    }
  });
});

// Initialize database on startup
getDb().catch((err) => {
  console.error("[Database] Initialization error:", err);
});

export default app;

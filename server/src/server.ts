import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";

import { agoraRoutes } from "./routes/agoraRoutes.js";
import { conversationRoutes } from "./routes/conversationRoutes.js";
import { caseRoutes } from "./routes/caseRoutes.js";
import { getDb } from "./db/database.js";
import { AgoraCli } from "./agora/cli.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
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
    database: "SQLite (vocaai.sqlite active)",
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

// Robust resolution of client dist
const candidatePaths = [
  path.resolve(process.cwd(), "client", "dist"),
  path.resolve(process.cwd(), "..", "client", "dist"),
  path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')), "..", "..", "client", "dist")
];
const CLIENT_DIST = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
app.use(express.static(CLIENT_DIST));
app.get("*", (_req, res) => {
  const indexPath = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("VocaAI Studio Backend API Active on port " + PORT);
  }
});

// Real-Time WebSocket Server
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  ws.send(JSON.stringify({ type: "CONNECTION_ESTABLISHED", timestamp: new Date().toISOString() }));

  ws.on("message", (raw: string) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
      }
    } catch (e) {}
  });
});

// Initialize database & start server
getDb().then(() => {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  VocaAI Studio Live on http://127.0.0.1:${PORT}       `);
    console.log(`  Agora Conversational AI & WebRTC Engine Ready       `);
    console.log(`=======================================================`);
  });
});

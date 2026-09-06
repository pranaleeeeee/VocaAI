import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { app } from "./app.js";
import { getDb } from "./db/database.js";

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Robust resolution of client dist
const candidatePaths = [
  path.resolve(process.cwd(), "client", "dist"),
  path.resolve(process.cwd(), "..", "client", "dist"),
  path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')), "..", "..", "client", "dist")
];
const CLIENT_DIST = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
app.use(expressStaticFallback(CLIENT_DIST));
app.get("*", (_req, res) => {
  const indexPath = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("VocaAI Studio Backend API Active on port " + PORT);
  }
});

function expressStaticFallback(rootPath: string) {
  return (req: any, res: any, next: any) => {
    if (req.path.startsWith("/api")) return next();
    const filePath = path.join(rootPath, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    next();
  };
}

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

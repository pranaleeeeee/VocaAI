import { Router } from "express";
import { ConversationOrchestrator } from "../conversation/orchestrator.js";
import { StateManager } from "../conversation/stateManager.js";
import { TtsService } from "../services/ttsService.js";

export const conversationRoutes = Router();

conversationRoutes.post("/turn", async (req, res) => {
  try {
    const { conversationId = `conv_${Date.now()}`, utterance, interrupted = false } = req.body;
    if (!utterance || typeof utterance !== "string") {
      return res.status(400).json({ error: "Missing utterance parameter" });
    }

    const result = await ConversationOrchestrator.processTurn(conversationId, utterance, interrupted);
    res.json(result);
  } catch (err: any) {
    console.error(`[ConversationRoutes] Unhandled error during turn processing:`, err);
    // Graceful recovery: Return a valid fallback answer so the frontend conversation never crashes or freezes
    res.status(200).json({
      action: "ANSWER",
      spokenResponse: "I ran into a temporary issue retrieving that, but I am right here. How can I help you?",
      screenData: {
        headline: "System Recovery",
        detail: "The previous request encountered an unexpected error, but conversation state has been safely preserved."
      },
      confidence: 0.85,
      entities: [],
      pendingConfirmation: null,
      escalation: null,
      ticketCreated: false
    });
  }
});

conversationRoutes.post("/barge-in", (req, res) => {
  const { conversationId } = req.body;
  if (conversationId) {
    StateManager.setAiSpeaking(conversationId, false);
  }
  res.json({ success: true, message: "AI speech halted. Listening to caller." });
});

conversationRoutes.post("/reset", (req, res) => {
  const { conversationId = `conv_${Date.now()}` } = req.body;
  const conv = StateManager.reset(conversationId);
  res.json({ success: true, conversation: conv });
});

conversationRoutes.get("/:id", (req, res) => {
  const conv = StateManager.get(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found" });
  }
  res.json(conv);
});

conversationRoutes.post("/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });
    const audioPath = await TtsService.synthesize(text, voice);
    res.sendFile(audioPath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

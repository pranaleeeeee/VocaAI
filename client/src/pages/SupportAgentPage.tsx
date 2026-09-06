import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api.js";
import { WaveformVisualizer } from "../components/WaveformVisualizer.js";
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { ConversationEntities, CaseRecord, AgoraSessionInfo, WebSourceItem } from "../types/index.js";
import { formatEscalationReason } from "../components/CaseDetailModal.js";
import {
  Mic, MicOff, Send, RotateCcw, Volume2, VolumeX, ShieldAlert,
  UserCheck, Loader2, Sparkles, Languages, Check, ArrowRight
} from "lucide-react";

interface SupportAgentPageProps {
  mode: "LIVE" | "DEMO";
  onViewCase?: (ticketId: string) => void;
  initialPrompt?: string;
}

interface MessageItem {
  id: string;
  speaker: "user" | "assistant";
  text: string;
  timestamp: string;
  language?: string;
  confidence?: number;
  sources?: WebSourceItem[];
}

export const SupportAgentPage: React.FC<SupportAgentPageProps> = ({ mode, onViewCase, initialPrompt }) => {
  const [conversationId, setConversationId] = useState<string>(`conv_${Date.now()}`);
  const [isCalling, setIsCalling] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingTurn, setIsLoadingTurn] = useState(false);
  const [interimText, setInterimText] = useState<string>("" );
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoicePersona, setSelectedVoicePersona] = useState<string>("natural_uk");

  // Load and cache high-quality voices as soon as browser engine initializes
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      }
    };
    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Telemetry & State
  const [aiState, setAiState] = useState<string>("GREETING");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("Hindi / English");
  const [intent, setIntent] = useState<string>("General Support");
  const [confidence, setConfidence] = useState<number>(0.96);
  const [entities, setEntities] = useState<ConversationEntities>({});
  const [escalatedTicket, setEscalatedTicket] = useState<CaseRecord | null>(null);

  // Transcript
  const [transcript, setTranscript] = useState<MessageItem[]>([
    {
      id: "init",
      speaker: "assistant",
      text: "Hello! I'm VocaAI. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      language: "Hindi + English",
      confidence: 0.98
    }
  ]);

  const [inputVal, setInputVal] = useState("");
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isCallingRef = useRef<boolean>(false);
  const isAiSpeakingRef = useRef<boolean>(false);
  const aiSpeakingFinishedAtRef = useRef<number>(0);
  const lastAiSpokenTextRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>("");
  const [sttLanguage, setSttLanguage] = useState<string>("en-US");
  const sttLanguageRef = useRef<string>("en-US");
  const lastSentTextRef = useRef<string>("");
  const lastTurnSentTimeRef = useRef<number>(0);
  const isLoadingTurnRef = useRef<boolean>(false);
  const isContinuousListeningRef = useRef<boolean>(true);
  const isRecognitionRunningRef = useRef<boolean>(false);
  const speechTimeoutRef = useRef<any>(null);

  // Agora RTC Real-Time Voice Connection
  const [agoraSession, setAgoraSession] = useState<AgoraSessionInfo | null>(null);
  const [agoraConnected, setAgoraConnected] = useState<boolean>(false);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  // Keep refs in sync with state for event callbacks
  useEffect(() => { isCallingRef.current = isCalling; }, [isCalling]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
  useEffect(() => { isLoadingTurnRef.current = isLoadingTurn; }, [isLoadingTurn]);
  useEffect(() => { sttLanguageRef.current = sttLanguage; }, [sttLanguage]);

  // Handle initialPrompt if passed from Landing Page
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendTurn(initialPrompt);
    }
  }, [initialPrompt]);

  // Auto-scroll transcript container to newest message
  const scrollToTranscriptBottom = (smooth = true) => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTo({
        top: transcriptContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  };

  useEffect(() => {
    scrollToTranscriptBottom(true);
  }, [transcript, isLoadingTurn]);

  // Safe start/restart recognition without throwing
  const safeStartRecognition = () => {
    if (!isContinuousListeningRef.current || isAiSpeakingRef.current || isRecognitionRunningRef.current) return;
    
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }
    const rec = recognitionRef.current;
    if (!rec) return;

    try {
      rec.start();
      isRecognitionRunningRef.current = true;
      setIsMicActive(true);
      setIsListening(true);
    } catch (e: any) {
      // If already started, just ignore. 
      if (e.name === "InvalidStateError") {
        isRecognitionRunningRef.current = true;
      } else {
        isRecognitionRunningRef.current = false;
      }
    }
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech Recognition not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // en-IN strongly supports Hindi and English mixing (Hinglish)
    recognition.lang = sttLanguageRef.current === "en-US" ? "en-IN" : sttLanguageRef.current;

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
      setIsMicActive(true);
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const now = Date.now();
      if (isAiSpeakingRef.current || now < aiSpeakingFinishedAtRef.current + 350 || isLoadingTurnRef.current) {
        return;
      }

      let finalChunk = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      finalChunk = finalChunk.trim();
      currentInterim = currentInterim.trim();

      if (currentInterim) {
        setInterimText(currentInterim);
      }

      if (finalChunk) {
        const combined = (accumulatedTranscriptRef.current + " " + finalChunk).trim();
        accumulatedTranscriptRef.current = combined;
        setInputVal(combined);
        setInterimText("");

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Reduced from 900ms to 400ms for snappier responses
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = accumulatedTranscriptRef.current.trim();
          if (
            textToSend.length >= 2 &&
            !isAiSpeakingRef.current &&
            !isLoadingTurnRef.current
          ) {
            accumulatedTranscriptRef.current = "";
            setInterimText("");
            setInputVal("");
            handleSendTurn(textToSend);
          }
        }, 400);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setErrorMessage("Microphone access was denied. Please allow Microphone access in your browser.");
        isContinuousListeningRef.current = false;
        isRecognitionRunningRef.current = false;
        setIsMicActive(false);
        setIsListening(false);
      } else if (event.error === "network" || event.error === "no-speech") {
        isRecognitionRunningRef.current = false;
        // Do not rapidly restart on no-speech, let liveness timer handle it gracefully
      } else {
        isRecognitionRunningRef.current = false;
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (!isContinuousListeningRef.current) {
        setIsMicActive(false);
        setIsListening(false);
      }
    };

    return recognition;
  };

  useEffect(() => {
    const rec = initSpeechRecognition();
    recognitionRef.current = rec;

    const livenessTimer = setInterval(() => {
      if (
        isContinuousListeningRef.current &&
        !isAiSpeakingRef.current &&
        !isLoadingTurnRef.current &&
        !isRecognitionRunningRef.current
      ) {
        safeStartRecognition();
      }
      if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 1500);

    return () => {
      clearInterval(livenessTimer);
      if (rec) {
        try { rec.abort(); } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleMic = () => {
    if (isMicActive || isRecognitionRunningRef.current) {
      isContinuousListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      isRecognitionRunningRef.current = false;
      setIsMicActive(false);
      setIsListening(false);
    } else {
      setErrorMessage(null);
      isContinuousListeningRef.current = true;
      safeStartRecognition();
    }
  };

  const handleSendTurn = async (textToSend: string) => {
    if (!textToSend || !textToSend.trim() || isLoadingTurnRef.current) return;

    if (isAiSpeakingRef.current && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
    }

    const cleanedText = textToSend.trim();
    const lowerCleaned = cleanedText.toLowerCase();
    const lastSpoken = lastAiSpokenTextRef.current.toLowerCase();

    const timeSinceAiSpoke = Date.now() - aiSpeakingFinishedAtRef.current;
    if (timeSinceAiSpoke < 500 && lastSpoken && lastSpoken.length > 20) {
      if (lowerCleaned.length > 20 && lastSpoken.includes(lowerCleaned)) {
        return;
      }
    }

    if (
      lastSentTextRef.current.toLowerCase() === lowerCleaned &&
      Date.now() - lastTurnSentTimeRef.current < 800
    ) {
      return;
    }

    lastSentTextRef.current = cleanedText;
    lastTurnSentTimeRef.current = Date.now();
    setErrorMessage(null);

    const userMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      speaker: "user",
      text: cleanedText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setTranscript((prev) => [...prev, userMsg]);
    setInputVal("");
    setInterimText("");
    setIsLoadingTurn(true);
    isLoadingTurnRef.current = true;

    try {
      const result = await api.sendTurn(conversationId, cleanedText);

      setAiState(result.state);
      setDetectedLanguage(result.language);
      setConfidence(result.confidence);
      setEntities(result.entities);

      if (result.intent) {
        setIntent(result.intent);
      }

      if (result.ticket) {
        setEscalatedTicket(result.ticket);
      }

      const agentMsg: MessageItem = {
        id: `msg_${Date.now() + 1}`,
        speaker: "assistant",
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        language: result.language,
        confidence: result.confidence,
        sources: result.sources
      };
      setTranscript((prev) => [...prev, agentMsg]);

      if (soundEnabled) {
        playAiSpeech(result.reply, result.language);
      } else {
        if (isContinuousListeningRef.current) {
          setTimeout(() => {
            safeStartRecognition();
          }, 200);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Connection error";
      console.error("[VocaAI Turn Error]", {
        endpoint: "/api/conversation/turn",
        conversationId,
        error: errorMsg,
        type: err?.name || "Error",
        timestamp: new Date().toISOString()
      });
      const fallbackReply = "I ran into a brief connection issue, but I'm still listening. How can I help you?";
      setErrorMessage(errorMsg);

      const agentMsg: MessageItem = {
        id: `msg_${Date.now() + 1}`,
        speaker: "assistant",
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        confidence: 0.8
      };
      setTranscript((prev) => [...prev, agentMsg]);

      if (soundEnabled) {
        playAiSpeech(fallbackReply);
      } else {
        if (isContinuousListeningRef.current) {
          setTimeout(() => {
            safeStartRecognition();
          }, 300);
        }
      }
    } finally {
      setIsLoadingTurn(false);
      isLoadingTurnRef.current = false;
    }
  };

  const getEarPleasingVoice = (lang?: string, persona = selectedVoicePersona): SpeechSynthesisVoice | null => {
    const voices = availableVoices.length > 0
      ? availableVoices
      : (typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);

    if (!voices || voices.length === 0) return null;

    if (lang === "Hindi" || persona === "indian") {
      const hiVoice = voices.find((v) =>
        v.lang.includes("hi") || v.name.includes("India") || v.name.includes("Hindi") ||
        v.name.includes("Neerja") || v.name.includes("Swara") || v.name.includes("Heera")
      );
      if (hiVoice) return hiVoice;
    }

    if (persona === "natural_uk") {
      const ukVoice = voices.find((v) => v.name.includes("Google UK English Female") || (v.lang.includes("en-GB") && !v.name.includes("David")));
      if (ukVoice) return ukVoice;
    }

    if (persona === "warm_us") {
      const usVoice = voices.find((v) => v.name.includes("Google US English") || v.name.includes("Jenny") || v.name.includes("Aria") || v.name.includes("Guy"));
      if (usVoice) return usVoice;
    }

    if (persona === "soft_clear") {
      const ziraVoice = voices.find((v) => v.name.includes("Zira") || v.name.includes("Natural") || v.name.includes("Google UK English Female"));
      if (ziraVoice) return ziraVoice;
    }

    const premiumVoice = voices.find((v) =>
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Zira") || v.name.includes("Aria") || v.name.includes("Jenny")) &&
      !v.name.includes("David")
    ) || voices.find((v) => !v.name.includes("David")) || voices[0];

    return premiumVoice || null;
  };

  const playAiSpeech = (text: string, lang?: string, customVoice?: SpeechSynthesisVoice) => {
    if (!window.speechSynthesis) return;

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    window.speechSynthesis.cancel();
    isAiSpeakingRef.current = true;
    setIsAiSpeaking(true);
    lastAiSpokenTextRef.current = text;

    if (recognitionRef.current && isRecognitionRunningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      isRecognitionRunningRef.current = false;
    }

    const cleanSpeechText = (raw: string): string => {
      return raw
        .replace(/[*_#`~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/TKT-\d+-\d+/g, (match) => `Ticket ${match.replace(/-/g, " ")}`)
        .replace(/\b(\d{5,})\b/g, (match) => match.split("").join(" "))
        .replace(/([0-9]+)\s*°C/g, "$1 degrees Celsius")
        .replace(/[•]/g, ". ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const spokenText = cleanSpeechText(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);

    (window as any).__vocaActiveUtterance = utterance;
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = customVoice || getEarPleasingVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    const finishSpeaking = () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      (window as any).__vocaActiveUtterance = null;
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
      aiSpeakingFinishedAtRef.current = Date.now();
      lastAiSpokenTextRef.current = "";

      if (isContinuousListeningRef.current) {
        setTimeout(() => {
          safeStartRecognition();
        }, 200);
      }
    };

    utterance.onstart = () => {
      isAiSpeakingRef.current = true;
      setIsAiSpeaking(true);
      setInterimText("");
    };

    utterance.onend = () => {
      finishSpeaking();
    };

    utterance.onerror = () => {
      finishSpeaking();
    };

    const words = spokenText.split(/\s+/).filter(Boolean).length;
    const maxDurationMs = Math.max(3000, Math.ceil((words / 1.8) * 1000) + 2000);
    speechTimeoutRef.current = setTimeout(() => {
      if (isAiSpeakingRef.current) {
        finishSpeaking();
      }
    }, maxDurationMs);

    window.speechSynthesis.speak(utterance);
  };

  const resetSession = async () => {
    const oldId = conversationId;
    const newId = `conv_${Date.now()}`;
    setConversationId(newId);
    setEntities({});
    setEscalatedTicket(null);
    setAiState("GREETING");
    setIntent("General Support");
    setConfidence(0.96);
    setDetectedLanguage("Hindi / English");
    setErrorMessage(null);
    setInterimText("");
    lastSentTextRef.current = "";
    lastTurnSentTimeRef.current = 0;
    lastAiSpokenTextRef.current = "";
    accumulatedTranscriptRef.current = "";
    isLoadingTurnRef.current = false;
    setIsLoadingTurn(false);
    isAiSpeakingRef.current = false;
    setIsAiSpeaking(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    setTranscript([
      {
        id: "init",
        speaker: "assistant",
        text: "Hello! I'm VocaAI. How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        language: "Hindi + English",
        confidence: 0.98
      }
    ]);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    await Promise.all([
      api.resetConversation(oldId).catch(() => {}),
      api.resetConversation(newId).catch(() => {})
    ]);
    if (isContinuousListeningRef.current) {
      setTimeout(() => {
        safeStartRecognition();
      }, 300);
    }
  };

  // Extract contextual detail for the "Now Understanding" panel
  const contextDetail = Object.entries(entities)
    .filter(([_, data]) => data && data.value)
    .map(([key, data]) => `${key.replace(/_/g, " ")}: ${data.value}`)
    .slice(0, 2)
    .join(" • ") || (aiState !== "GREETING" ? aiState.replace(/_/g, " ") : "Active Session");

  return (
    <div style={{
      maxWidth: "920px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      padding: "16px 0 48px",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {/* 1. Header: Small status & controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        padding: "0 4px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: "#34d399",
            boxShadow: "0 0 10px rgba(52, 211, 153, 0.7)"
          }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>
            VocaAI is ready
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>•</span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Continuous Multilingual Voice
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* STT Language Selector */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(255, 255, 255, 0.04)",
            padding: "3px 10px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-subtle)"
          }}>
            <Languages size={13} color="#818cf8" />
            <select
              value={sttLanguage}
              onChange={(e) => {
                const newLang = e.target.value;
                setSttLanguage(newLang);
                sttLanguageRef.current = newLang;
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.abort();
                    isRecognitionRunningRef.current = false;
                    recognitionRef.current = initSpeechRecognition();
                    if (isContinuousListeningRef.current) safeStartRecognition();
                  } catch (_) {}
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                fontSize: "12px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="en-US" style={{ background: "#0b101c" }}>English (US)</option>
              <option value="en-IN" style={{ background: "#0b101c" }}>English (India)</option>
              <option value="hi-IN" style={{ background: "#0b101c" }}>Hindi (हिन्दी)</option>
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (soundEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
            }}
            style={{
              padding: "5px 12px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              color: soundEnabled ? "var(--text-secondary)" : "#f87171",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            title={soundEnabled ? "Mute Voice" : "Enable Voice"}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>

          {/* New Chat */}
          <button
            onClick={resetSession}
            style={{
              padding: "5px 12px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
            title="Start fresh conversation"
          >
            <RotateCcw size={12} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Siri Microphone & Waveform Centerpiece */}
      <div style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 0 12px"
      }}>
        {/* Animated Waveform */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "480px",
          height: "110px",
          pointerEvents: "none"
        }}>
          <WaveformVisualizer
            isSpeaking={isAiSpeaking}
            isListening={isListening || isMicActive}
            height={90}
            width={480}
          />
        </div>

        {/* Siri Circular Mic Button */}
        <button
          onClick={toggleMic}
          style={{
            width: "92px",
            height: "92px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            zIndex: 10,
            boxShadow: isAiSpeaking
              ? "0 0 30px rgba(139, 92, 246, 0.45)"
              : isListening || isMicActive
              ? "0 0 28px rgba(99, 102, 241, 0.45)"
              : "0 8px 24px rgba(0, 0, 0, 0.3)",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            outline: "none"
          }}
          title={isMicActive ? "Mute Microphone" : "Tap to Speak"}
        >
          <div style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: isAiSpeaking
              ? "linear-gradient(135deg, #8b5cf6, #ec4899)"
              : isListening || isMicActive
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)"
          }}>
            {isLoadingTurn ? (
              <Loader2 size={26} color="#ffffff" className="spin" />
            ) : isMicActive || isListening ? (
              <Mic size={26} color="#ffffff" />
            ) : (
              <MicOff size={26} color="var(--text-secondary)" />
            )}
          </div>
        </button>

        {/* State Label */}
        <div style={{
          marginTop: "14px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          letterSpacing: "0.2px"
        }}>
          {isLoadingTurn ? "Thinking..." :
           isAiSpeaking ? "Speaking..." :
           isListening || isMicActive ? (interimText ? `"${interimText}"` : "Listening...") :
           "Tap to talk"}
        </div>
      </div>

      {/* 3. Live Conversation Transcript (iOS Messages Style) */}
      <div
        ref={transcriptContainerRef}
        style={{
          background: "rgba(255, 255, 255, 0.025)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "24px 28px",
          minHeight: "360px",
          maxHeight: "460px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          backdropFilter: "blur(20px)"
        }}
      >
        {transcript.map((m) => {
          const isUser = m.speaker === "user";
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                width: "100%"
              }}
            >
              {/* Speaker Label */}
              <div style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-dim)",
                marginBottom: "5px",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span>{isUser ? "You" : "VocaAI"}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              {/* iOS Message Bubble */}
              <div style={{
                maxWidth: "78%",
                padding: "13px 18px",
                borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                background: isUser
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                  : "rgba(255, 255, 255, 0.055)",
                border: isUser ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                color: isUser ? "#ffffff" : "#f1f5f9",
                fontSize: "14.5px",
                lineHeight: "1.52",
                fontWeight: 400,
                boxShadow: isUser
                  ? "0 4px 14px rgba(99, 102, 241, 0.25)"
                  : "0 2px 8px rgba(0, 0, 0, 0.2)",
                wordBreak: "break-word"
              }}>
                {m.text}

                {/* Optional Play Audio Icon for Assistant */}
                {!isUser && (
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => playAiSpeech(m.text, m.language)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px"
                      }}
                      title="Listen again"
                    >
                      <Volume2 size={12} />
                      <span>Replay</span>
                    </button>

                    {m.sources && m.sources.length > 0 && (
                      <span style={{ fontSize: "11px", color: "#38bdf8" }}>
                        • Verified with live sources
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoadingTurn && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", padding: "6px 12px" }}>
            <Loader2 size={14} className="spin" />
            <span>VocaAI is thinking...</span>
          </div>
        )}
      </div>

      {/* 4. Compact "Now Understanding" Panel */}
      <div style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px"
      }}>
        <div style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1px",
          color: "var(--text-dim)",
          textTransform: "uppercase"
        }}>
          NOW UNDERSTANDING
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", fontSize: "12.5px" }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Language: </span>
            <strong style={{ color: "var(--text-main)", fontWeight: 500 }}>{detectedLanguage}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Intent: </span>
            <strong style={{ color: "#818cf8", fontWeight: 500 }}>{intent}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Confidence: </span>
            <strong style={{ color: confidence >= 0.8 ? "#34d399" : "#fbbf24", fontWeight: 500 }}>
              {confidence >= 0.85 ? "High" : "Moderate"}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Context: </span>
            <span style={{ color: "var(--text-secondary)" }}>{contextDetail}</span>
          </div>
        </div>
      </div>

      {/* 5. Calm Escalation UI (When Escalated) */}
      {escalatedTicket && (
        <div style={{
          background: "rgba(99, 102, 241, 0.05)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: "0 0 4px" }}>
                Human support is joining
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                Your conversation context has been shared with the support team.
              </p>
            </div>
            <span style={{
              fontSize: "11px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255, 255, 255, 0.08)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)"
            }}>
              #{escalatedTicket.ticket_id}
            </span>
          </div>

          {/* AI Handoff Brief */}
          <div style={{
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            fontSize: "12.5px"
          }}>
            <div>
              <div style={{ color: "var(--text-dim)", marginBottom: "2px" }}>Issue</div>
              <div style={{ color: "var(--text-main)", fontWeight: 500 }}>{escalatedTicket.issue_type}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-dim)", marginBottom: "2px" }}>Information collected</div>
              <div style={{ color: "#34d399", fontWeight: 500 }}>
                {escalatedTicket.customer_name ? `Name: ${escalatedTicket.customer_name}` : "Details collected"}
                {escalatedTicket.reference_id ? ` • Ref #${escalatedTicket.reference_id}` : ""}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-dim)", marginBottom: "2px" }}>Reason for escalation</div>
              <div style={{ color: "var(--text-secondary)" }}>
                {formatEscalationReason(escalatedTicket.escalation_reason || escalatedTicket.summary)}
              </div>
            </div>
          </div>

          {onViewCase && (
            <button
              className="btn btn-secondary"
              onClick={() => onViewCase(escalatedTicket.ticket_id)}
              style={{
                alignSelf: "flex-start",
                padding: "8px 18px",
                fontSize: "13px"
              }}
            >
              <span>View Case in Supervisor Desk</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* 6. Suggestion Chips */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
        {[
          "Where is my order? Ref #458291",
          "What is the weather in Mumbai?",
          "What is the capital of Rajasthan?",
          "I want to speak with a human supervisor"
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendTurn(prompt)}
            disabled={isLoadingTurn}
            style={{
              whiteSpace: "nowrap",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-full)",
              padding: "6px 14px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* 7. Input Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-full)",
        padding: "6px 8px 6px 16px"
      }}>
        <input
          type="text"
          placeholder={isMicActive ? "Listening... or type here" : "Ask anything or tap microphone..."}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendTurn(inputVal);
            }
          }}
          disabled={isLoadingTurn}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "#ffffff",
            fontSize: "14px",
            outline: "none"
          }}
        />

        <button
          onClick={toggleMic}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: isMicActive ? "rgba(99, 102, 241, 0.2)" : "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isMicActive ? "#818cf8" : "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.15s"
          }}
          title={isMicActive ? "Mute microphone" : "Speak with microphone"}
        >
          <Mic size={17} />
        </button>

        <button
          onClick={() => handleSendTurn(inputVal)}
          disabled={isLoadingTurn || !inputVal.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: inputVal.trim() ? "var(--accent-gradient)" : "rgba(255, 255, 255, 0.06)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            cursor: inputVal.trim() ? "pointer" : "default",
            opacity: inputVal.trim() ? 1 : 0.4,
            transition: "all 0.15s"
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

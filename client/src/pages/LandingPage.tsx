import React, { useState } from "react";
import { Mic, MessageSquare, Globe, UserCheck, ArrowRight, Loader2 } from "lucide-react";
import { WaveformVisualizer } from "../components/WaveformVisualizer.js";

interface LandingPageProps {
  onStartCustomer: (initialPrompt?: string) => void;
  onOpenSupervisor: () => void;
  agoraConnected?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCustomer,
  onOpenSupervisor
}) => {
  const [micState, setMicState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  const suggestionChips = [
    "What’s the weather in Mumbai?",
    "What are today's latest headlines?",
    "Explain quantum computing simply.",
    "I need help with my order."
  ];

  const handleMicClick = () => {
    // Immediate transition to the voice assistant interface
    onStartCustomer();
  };

  const handleChipClick = (prompt: string) => {
    onStartCustomer(prompt);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "48px",
      padding: "36px 0 64px",
      maxWidth: "960px",
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {/* Hero Section */}
      <section style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        maxWidth: "720px"
      }}>
        {/* Eyebrow */}
        <span style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "1.2px",
          textTransform: "uppercase",
          color: "#818cf8"
        }}>
          YOUR AI VOICE ASSISTANT
        </span>

        {/* Main Headline */}
        <h1 style={{
          fontSize: "44px",
          fontWeight: 700,
          letterSpacing: "-0.8px",
          lineHeight: "1.18",
          color: "#ffffff",
          margin: 0
        }}>
          Talk. Get Answers. Move Forward.
        </h1>

        {/* Supporting Text */}
        <p style={{
          fontSize: "16.5px",
          color: "var(--text-secondary)",
          lineHeight: "1.55",
          margin: 0,
          fontWeight: 400
        }}>
          Natural conversations. Real-time information. Human support when you need it.
        </p>
      </section>

      {/* Primary Voice Interaction Centerpiece */}
      <section style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: "100%",
        padding: "16px 0 20px"
      }}>
        {/* Waveform Behind/Around Microphone */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "460px",
          height: "120px",
          pointerEvents: "none"
        }}>
          <WaveformVisualizer
            isSpeaking={micState === "speaking"}
            isListening={micState === "listening"}
            height={100}
            width={460}
          />
        </div>

        {/* Large Circular Siri/Apple Microphone Control */}
        <button
          onClick={handleMicClick}
          onMouseEnter={() => setMicState("listening")}
          onMouseLeave={() => setMicState("idle")}
          style={{
            width: "104px",
            height: "104px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            zIndex: 10,
            boxShadow: micState === "listening"
              ? "0 0 28px rgba(99, 102, 241, 0.4), inset 0 0 16px rgba(255, 255, 255, 0.1)"
              : "0 8px 24px rgba(0, 0, 0, 0.3), inset 0 0 12px rgba(255, 255, 255, 0.04)",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            outline: "none"
          }}
          title="Tap to talk"
        >
          {/* Inner Accent Ring */}
          <div style={{
            width: "76px",
            height: "76px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)"
          }}>
            {micState === "thinking" ? (
              <Loader2 size={30} color="#ffffff" className="spin" />
            ) : (
              <Mic size={30} color="#ffffff" />
            )}
          </div>
        </button>

        {/* State Label */}
        <div style={{
          marginTop: "16px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          letterSpacing: "0.2px"
        }}>
          {micState === "listening" ? "Listening..." :
           micState === "thinking" ? "Thinking..." :
           micState === "speaking" ? "Speaking..." :
           "Tap to talk"}
        </div>
      </section>

      {/* Quick Prompts Suggestion Chips */}
      <section style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        justifyContent: "center",
        maxWidth: "780px"
      }}>
        {suggestionChips.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(prompt)}
            style={{
              padding: "9px 18px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255, 255, 255, 0.035)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 400,
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.035)";
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {prompt}
          </button>
        ))}
      </section>

      {/* Three Core Capabilities */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
        gap: "20px",
        width: "100%",
        marginTop: "16px"
      }}>
        {/* Capability 1: Conversation */}
        <div
          className="ios-card"
          onClick={() => onStartCustomer()}
          style={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "26px",
            minHeight: "180px"
          }}
        >
          <div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(99, 102, 241, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <MessageSquare size={18} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: "16.5px", fontWeight: 600, color: "#ffffff", margin: "0 0 8px" }}>
              Have a conversation
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Ask questions, get information, or just talk naturally.
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#818cf8",
            marginTop: "18px"
          }}>
            <span>Start talking</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Capability 2: Real-time information */}
        <div
          className="ios-card"
          onClick={() => onStartCustomer("What is the latest news and weather?")}
          style={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "26px",
            minHeight: "180px"
          }}
        >
          <div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <Globe size={18} color="#38bdf8" />
            </div>
            <h3 style={{ fontSize: "16.5px", fontWeight: 600, color: "#ffffff", margin: "0 0 8px" }}>
              Real-time information
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Get current information when the answer depends on what's happening now.
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#38bdf8",
            marginTop: "18px"
          }}>
            <span>Ask VocaAI</span>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Capability 3: Human support */}
        <div
          className="ios-card"
          onClick={onOpenSupervisor}
          style={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "26px",
            minHeight: "180px"
          }}
        >
          <div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(52, 211, 153, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <UserCheck size={18} color="#34d399" />
            </div>
            <h3 style={{ fontSize: "16.5px", fontWeight: 600, color: "#ffffff", margin: "0 0 8px" }}>
              Human support when needed
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
              When VocaAI can't safely resolve an issue, it can hand the conversation to a human with context preserved.
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#34d399",
            marginTop: "18px"
          }}>
            <span>Learn more</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </section>

      {/* Small Closing Statement */}
      <section style={{
        marginTop: "12px",
        textAlign: "center"
      }}>
        <p style={{
          fontSize: "14px",
          color: "var(--text-muted)",
          fontStyle: "normal",
          fontWeight: 400
        }}>
          More than a chatbot. A conversation that knows when to ask for help.
        </p>
      </section>
    </div>
  );
};

import React from "react";
import { ArrowRight, CheckCircle2, AlertTriangle, ShieldAlert, Users, Mic, Activity, X } from "lucide-react";
import { ConversationEntities } from "../types/index.js";

interface PresentationModeProps {
  onClose: () => void;
  onOpenLiveAssistant: () => void;
  onOpenSupervisor: () => void;
  state: string;
  language: string;
  intent: string;
  confidence: number;
  entities: ConversationEntities;
  isEscalated: boolean;
  ticketId?: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  onClose,
  onOpenLiveAssistant,
  onOpenSupervisor,
  state,
  language,
  intent,
  confidence,
  entities,
  isEscalated,
  ticketId
}) => {
  const confPercent = Math.round(confidence * 100);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(5, 8, 16, 0.95)",
      backdropFilter: "blur(20px)",
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      padding: "32px 48px",
      overflowY: "auto"
    }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ padding: "6px 14px", borderRadius: "var(--radius-full)", background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#a5b4fc", fontSize: "12px", fontWeight: 700 }}>
            JUDGE PRESENTATION MODE
          </div>
          <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>•</span>
          <strong style={{ fontSize: "18px", color: "#fff" }}>VocaAI Studio Enterprise Architecture</strong>
        </div>

        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          title="Exit Presentation Mode"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main High-Impact Architecture Layout */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "1200px", margin: "40px auto", width: "100%", gap: "36px" }}>
        {/* Core Value Statement */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
            "VocaAI doesn't guess. It understands, verifies, and knows when to bring in a human."
          </h1>
          <p style={{ fontSize: "18px", color: "#94a3b8", margin: 0 }}>
            One conversation. Zero context lost.
          </p>
        </div>

        {/* Live State Telemetry Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          <div className="card" style={{ padding: "24px", textAlign: "center", background: "rgba(15, 23, 42, 0.8)" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Active Language</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#f8fafc", marginTop: "8px" }}>
              {language || "Hindi + English"}
            </div>
            <div style={{ fontSize: "11.5px", color: "#34d399", marginTop: "4px" }}>Seamless Code-Switching</div>
          </div>

          <div className="card" style={{ padding: "24px", textAlign: "center", background: "rgba(15, 23, 42, 0.8)" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Identified Intent</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#38bdf8", marginTop: "8px" }}>
              {intent || "General Support"}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>Domain-Agnostic Engine</div>
          </div>

          <div className="card" style={{ padding: "24px", textAlign: "center", background: "rgba(15, 23, 42, 0.8)" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>AI Confidence</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: confPercent >= 80 ? "#34d399" : confPercent >= 60 ? "#fbbf24" : "#f87171", marginTop: "8px" }}>
              {confPercent}%
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
              {confPercent >= 80 ? "High Confidence" : "Targeted Clarification"}
            </div>
          </div>

          <div className="card" style={{ padding: "24px", textAlign: "center", background: "rgba(15, 23, 42, 0.8)" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Operational State</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: isEscalated ? "#f87171" : "#a5b4fc", marginTop: "8px" }}>
              {isEscalated ? "ESCALATED TO HUMAN" : state || "LISTENING"}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
              {isEscalated ? `Ticket #${ticketId || "TKT-2026-ACTIVE"}` : "Autonomous Handling"}
            </div>
          </div>
        </div>

        {/* Workflow Progression Box */}
        <div className="card" style={{ padding: "28px", background: "rgba(15, 23, 42, 0.85)", borderColor: "rgba(99, 102, 241, 0.4)" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#818cf8", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            The AI $\rightarrow$ Human Handoff Guarantee
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", textAlign: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "20px" }}>🎙️</div>
              <strong style={{ fontSize: "13px", color: "#fff", display: "block", marginTop: "6px" }}>1. Understands</strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Multilingual speech stream</span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "20px" }}>🛡️</div>
              <strong style={{ fontSize: "13px", color: "#fff", display: "block", marginTop: "6px" }}>2. Verifies</strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Explicit detail confirmation</span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "20px" }}>📉</div>
              <strong style={{ fontSize: "13px", color: "#fff", display: "block", marginTop: "6px" }}>3. Evaluates</strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Catches low confidence & noise</span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "20px" }}>🤝</div>
              <strong style={{ fontSize: "13px", color: "#fff", display: "block", marginTop: "6px" }}>4. Escalates</strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Zero context lost</span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 12px", borderRadius: "10px" }}>
              <div style={{ fontSize: "20px" }}>👨‍💼</div>
              <strong style={{ fontSize: "13px", color: "#fff", display: "block", marginTop: "6px" }}>5. Takeover</strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Human continues seamlessly</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <button
            className="btn btn-primary"
            onClick={() => { onClose(); onOpenLiveAssistant(); }}
            style={{ padding: "12px 24px", fontSize: "14px" }}
          >
            <Mic size={16} />
            Jump to Customer Voice Console
          </button>
          <button
            className="btn btn-outline"
            onClick={() => { onClose(); onOpenSupervisor(); }}
            style={{ padding: "12px 24px", fontSize: "14px" }}
          >
            <Users size={16} color="#22d3ee" />
            Open Supervisor Portal
          </button>
        </div>
      </div>
    </div>
  );
};

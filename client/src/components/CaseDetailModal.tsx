import React, { useState } from "react";
import { CaseRecord, CaseEvent } from "../types/index.js";
import {
  X, Check, Clock, UserCheck, CheckCircle2,
  AlertCircle, MessageSquare, Send, ArrowRight, ShieldAlert,
  Sparkles, CornerDownRight, CheckCheck, PhoneForwarded
} from "lucide-react";

interface CaseDetailModalProps {
  caseRecord: CaseRecord;
  timeline: CaseEvent[];
  onClose: () => void;
  onUpdateStatus: (ticketId: string, status: CaseRecord["status"], note?: string) => Promise<void>;
}

export function formatEscalationReason(reason?: string | null): string {
  if (!reason) return "Direct customer request for human supervisor";
  const lower = reason.toLowerCase();
  if (lower.includes("explicitly requested") || lower.includes("human support agent") || lower.includes("speak with a human")) {
    return "Direct customer request for human supervisor";
  }
  if (lower.includes("medical") || lower.includes("fever") || lower.includes("medicine") || lower.includes("safety")) {
    return "Medical safety boundary: non-prescriptive advisory";
  }
  if (lower.includes("confidence remained low") || lower.includes("unclear audio")) {
    return "Low acoustic confidence: detail clarification needed";
  }
  if (lower.includes("financial") || lower.includes("payment")) {
    return "Financial safety verification guardrail";
  }
  if (lower.includes("reference") || lower.includes("order")) {
    return "Unresolved reference ID verification";
  }
  return reason.length > 55 ? reason.slice(0, 52) + "..." : reason;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseRecord,
  timeline,
  onClose,
  onUpdateStatus
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CaseRecord["status"]>(caseRecord.status);
  const [resolutionNote, setResolutionNote] = useState(caseRecord.resolution_note || "");
  const [isSaving, setIsSaving] = useState(false);
  const [takeoverActive, setTakeoverActive] = useState(caseRecord.status === "Human Handling");
  const [supervisorReplyText, setSupervisorReplyText] = useState("");
  const [supervisorMessages, setSupervisorMessages] = useState<Array<{ speaker: string; text: string; time: string }>>([
    ...(caseRecord.status === "Human Handling" ? [
      {
        speaker: "Supervisor",
        text: "Hello! I am reviewing your request with complete conversation context. How may I assist you right now?",
        time: new Date(caseRecord.updated_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ] : [])
  ]);

  let transcriptItems: Array<{ speaker: string; text: string; timestamp?: string }> = [];
  try {
    transcriptItems = JSON.parse(caseRecord.transcript || "[]");
  } catch (e) {
    transcriptItems = [{ speaker: "user", text: caseRecord.description || "" }];
  }

  const conciseReason = formatEscalationReason(caseRecord.escalation_reason || caseRecord.summary);

  const handleTakeover = async () => {
    setTakeoverActive(true);
    setSelectedStatus("Human Handling");
    const welcomeMsg = {
      speaker: "Supervisor",
      text: "Hello! I have your complete conversation context and am taking over to assist you directly.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setSupervisorMessages((prev) => [...prev, welcomeMsg]);
    await onUpdateStatus(
      caseRecord.ticket_id,
      "Human Handling",
      "Supervisor has taken over live conversation with zero context loss."
    );
  };

  const handleSendSupervisorMessage = (customText?: string) => {
    const textToSend = (customText || supervisorReplyText).trim();
    if (!textToSend) return;
    const newMsg = {
      speaker: "Supervisor",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setSupervisorMessages((prev) => [...prev, newMsg]);
    setSupervisorReplyText("");
  };

  const handleResolveCase = async () => {
    setIsSaving(true);
    setSelectedStatus("Resolved");
    await onUpdateStatus(
      caseRecord.ticket_id,
      "Resolved",
      resolutionNote || "Resolved successfully by human supervisor with full context preserved."
    );
    setIsSaving(false);
    onClose();
  };

  const handleSaveStatus = async () => {
    setIsSaving(true);
    await onUpdateStatus(caseRecord.ticket_id, selectedStatus, resolutionNote);
    setIsSaving(false);
  };

  // Parse structured information
  let confirmedList: string[] = [];
  let unconfirmedList: string[] = [];
  let missingList: string[] = [];

  try {
    if (caseRecord.confirmed_info) confirmedList = JSON.parse(caseRecord.confirmed_info);
  } catch (e) {
    if (caseRecord.confirmed_info) confirmedList = [caseRecord.confirmed_info];
  }
  try {
    if (caseRecord.unconfirmed_info) unconfirmedList = JSON.parse(caseRecord.unconfirmed_info);
  } catch (e) {
    if (caseRecord.unconfirmed_info) unconfirmedList = [caseRecord.unconfirmed_info];
  }
  try {
    if (caseRecord.missing_info) missingList = JSON.parse(caseRecord.missing_info);
  } catch (e) {
    if (caseRecord.missing_info) missingList = [caseRecord.missing_info];
  }

  // Fallback defaults if empty
  if (confirmedList.length === 0 && caseRecord.customer_name) {
    confirmedList.push(`Customer: ${caseRecord.customer_name}`);
  }
  if (confirmedList.length === 0 && (caseRecord.reference_id || caseRecord.order_id)) {
    confirmedList.push(`Reference ID: ${caseRecord.reference_id || caseRecord.order_id}`);
  }

  const ticketFormatted = caseRecord.ticket_id.startsWith("VCA-")
    ? caseRecord.ticket_id
    : `VCA-${caseRecord.ticket_id.replace(/^TKT-/, "")}`;

  const quickResponses = [
    "I have your verified context and am resolving this for you now.",
    `I see your reference #${caseRecord.reference_id || caseRecord.order_id || "458291"}. Looking into the update right away.`,
    "Your request has been verified and expedited with zero delay."
  ];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "920px",
        width: "100%",
        maxHeight: "92vh",
        overflowY: "auto",
        background: "rgba(10, 14, 26, 0.98)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "var(--radius-xl)",
        padding: "32px",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7)",
        display: "flex",
        flexDirection: "column",
        gap: "22px"
      }}>
        {/* Top: Case ID, Status, Priority, Close */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: takeoverActive
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)"
            }}>
              {takeoverActive ? <UserCheck size={18} color="#fff" /> : <PhoneForwarded size={18} color="#fff" />}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Case #{ticketFormatted}
                </h2>
                {takeoverActive && (
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                    Live Takeover Active
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                <strong style={{ color: "#ffffff" }}>Reason: </strong>
                <span>{conciseReason}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Restrained Status Pill */}
            <span style={{
              fontSize: "12px",
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: selectedStatus === "Escalated" ? "rgba(248, 113, 113, 0.14)" :
                          selectedStatus === "Human Handling" ? "rgba(99, 102, 241, 0.16)" :
                          "rgba(52, 211, 153, 0.14)",
              color: selectedStatus === "Escalated" ? "#fca5a5" :
                     selectedStatus === "Human Handling" ? "#c7d2fe" :
                     "#6ee7b7",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              {selectedStatus}
            </span>

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* STAR OF THE DEMO: Highlighted Live Takeover Callout / Action Banner */}
        <div style={{
          background: takeoverActive
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))"
            : "linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(139, 92, 246, 0.08))",
          border: takeoverActive
            ? "1px solid rgba(16, 185, 129, 0.35)"
            : "1px solid rgba(99, 102, 241, 0.35)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: takeoverActive
            ? "0 4px 20px rgba(16, 185, 129, 0.12)"
            : "0 4px 20px rgba(99, 102, 241, 0.15)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: takeoverActive ? "#34d399" : "#818cf8",
                boxShadow: takeoverActive ? "0 0 10px #34d399" : "0 0 10px #818cf8"
              }} />
              <strong style={{ fontSize: "14.5px", color: "#ffffff" }}>
                {takeoverActive ? "Supervisor Takeover Active" : "Direct Live Takeover Ready"}
              </strong>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
              {takeoverActive
                ? "You are now communicating directly with the customer. All verified history is synced."
                : "Step into this active session in one click. Zero context lost, customer never repeats details."}
            </p>
          </div>

          {!takeoverActive ? (
            <button
              onClick={handleTakeover}
              className="btn btn-primary"
              style={{
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 18px rgba(99, 102, 241, 0.4)"
              }}
            >
              <UserCheck size={17} />
              <span>Take Over Conversation</span>
            </button>
          ) : (
            <button
              onClick={handleResolveCase}
              className="btn"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                padding: "10px 20px",
                fontSize: "13.5px",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <CheckCheck size={16} />
              <span>Resolve & Close Case</span>
            </button>
          )}
        </div>

        {/* Context Preserved Checklist */}
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "12.5px"
        }}>
          <span style={{ fontWeight: 600, color: "#ffffff", letterSpacing: "0.2px" }}>
            Context preserved
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "var(--text-secondary)", flexWrap: "wrap" }}>
            <span>✓ Conversation history</span>
            <span>✓ Confirmed details</span>
            <span>✓ Unresolved items</span>
            <span>✓ Escalation reason</span>
          </div>
        </div>

        {/* AI Handoff Brief */}
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "18px 20px"
        }}>
          <div style={{ fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.8px" }}>
            AI HANDOFF BRIEF
          </div>
          <p style={{ fontSize: "14px", color: "#f8fafc", lineHeight: "1.55", margin: 0 }}>
            {caseRecord.summary || caseRecord.description || "Customer issue requires supervisor consultation."}
          </p>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--text-dim)" }}>Primary Escalation Trigger: </span>
            <strong style={{ color: "#c7d2fe" }}>{conciseReason}</strong>
          </div>
        </div>

        {/* Conversation Transcript */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.8px" }}>
              CONVERSATION TRANSCRIPT
            </span>
            <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
              {transcriptItems.length + supervisorMessages.length} total turns
            </span>
          </div>

          <div style={{
            background: "rgba(0, 0, 0, 0.28)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "18px",
            maxHeight: "240px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            {transcriptItems.map((item, idx) => {
              const isUser = item.speaker === "user" || item.speaker === "Caller";
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isUser ? "rgba(99, 102, 241, 0.18)" : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    color: isUser ? "#c7d2fe" : "#f8fafc",
                    fontSize: "13px",
                    lineHeight: "1.45"
                  }}
                >
                  <div style={{ fontSize: "10.5px", color: "var(--text-dim)", marginBottom: "3px" }}>
                    {isUser ? (caseRecord.customer_name || "Customer") : "VocaAI Assistant"}
                  </div>
                  {item.text}
                </div>
              );
            })}

            {/* Separator when Takeover happened */}
            {takeoverActive && (
              <div style={{
                textAlign: "center",
                padding: "8px 0",
                fontSize: "11.5px",
                color: "#34d399",
                borderTop: "1px dashed rgba(52, 211, 153, 0.3)",
                borderBottom: "1px dashed rgba(52, 211, 153, 0.3)",
                margin: "4px 0"
              }}>
                — Supervisor joined session • Real-time human channel connected —
              </div>
            )}

            {supervisorMessages.map((sMsg, sIdx) => (
              <div
                key={`sup_${sIdx}`}
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 4px 16px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  fontSize: "13px",
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.2)"
                }}
              >
                <div style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.8)", marginBottom: "3px" }}>
                  Supervisor • {sMsg.time}
                </div>
                {sMsg.text}
              </div>
            ))}
          </div>
        </div>

        {/* Live Supervisor Reply Console (When Takeover is Active) */}
        {takeoverActive && (
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
              Quick Reply Suggestions:
            </div>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
              {quickResponses.map((qr, qIdx) => (
                <button
                  key={qIdx}
                  onClick={() => handleSendSupervisorMessage(qr)}
                  style={{
                    whiteSpace: "nowrap",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-full)",
                    padding: "5px 12px",
                    fontSize: "11.5px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.color = "#cbd5e1"; }}
                >
                  💬 {qr}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <input
                type="text"
                placeholder="Type response to customer directly..."
                value={supervisorReplyText}
                onChange={(e) => setSupervisorReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendSupervisorMessage();
                  }
                }}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  outline: "none"
                }}
              />
              <button
                onClick={() => handleSendSupervisorMessage()}
                disabled={!supervisorReplyText.trim()}
                className="btn btn-primary"
                style={{ padding: "0 18px" }}
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}

        {/* Information Checklist: Confirmed, Needs Confirmation, Missing */}
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px", letterSpacing: "0.8px" }}>
            STRUCTURED DOSSIER
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px"
          }}>
            {/* Confirmed */}
            <div style={{
              background: "rgba(52, 211, 153, 0.04)",
              border: "1px solid rgba(52, 211, 153, 0.15)",
              borderRadius: "var(--radius-md)",
              padding: "14px"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#34d399", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={14} />
                <span>Confirmed Information</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {confirmedList.length > 0 ? (
                  confirmedList.map((c, i) => <li key={i}>• {c}</li>)
                ) : (
                  <li style={{ color: "var(--text-dim)" }}>No confirmed fields</li>
                )}
              </ul>
            </div>

            {/* Needs Confirmation */}
            <div style={{
              background: "rgba(251, 191, 36, 0.04)",
              border: "1px solid rgba(251, 191, 36, 0.15)",
              borderRadius: "var(--radius-md)",
              padding: "14px"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#fbbf24", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} />
                <span>Needs Confirmation</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {unconfirmedList.length > 0 ? (
                  unconfirmedList.map((u, i) => <li key={i}>• {u}</li>)
                ) : (
                  <li style={{ color: "var(--text-dim)" }}>None pending</li>
                )}
              </ul>
            </div>

            {/* Missing */}
            <div style={{
              background: "rgba(248, 113, 113, 0.04)",
              border: "1px solid rgba(248, 113, 113, 0.15)",
              borderRadius: "var(--radius-md)",
              padding: "14px"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#f87171", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} />
                <span>Missing Details</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {missingList.length > 0 ? (
                  missingList.map((m, i) => <li key={i}>• {m}</li>)
                ) : (
                  <li style={{ color: "var(--text-dim)" }}>No critical missing items</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px", letterSpacing: "0.8px" }}>
            SESSION TIMELINE
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            padding: "6px 0"
          }}>
            {[
              { label: "1. Customer Speaks", done: true },
              { label: "2. AI Analysis & Safety", done: true },
              { label: "3. Confidence Evaluation", done: true },
              { label: "4. Escalation Triggered", done: caseRecord.status === "Escalated" || caseRecord.status === "Human Handling" },
              { label: "5. Supervisor Live Takeover", done: takeoverActive || caseRecord.status === "Human Handling" }
            ].map((step, idx, arr) => (
              <React.Fragment key={idx}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "var(--radius-full)",
                  background: step.done ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: step.done ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid var(--border-subtle)",
                  fontSize: "12px",
                  color: step.done ? "#c7d2fe" : "var(--text-dim)",
                  whiteSpace: "nowrap"
                }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: step.done ? "#818cf8" : "var(--text-dim)"
                  }} />
                  <span>{step.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Status Update & Save */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>Case Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as CaseRecord["status"])}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "#ffffff",
                fontSize: "12.5px",
                padding: "6px 10px",
                outline: "none"
              }}
            >
              <option value="Escalated" style={{ background: "#0b101c" }}>Escalated</option>
              <option value="Human Handling" style={{ background: "#0b101c" }}>Human Handling</option>
              <option value="Resolved" style={{ background: "#0b101c" }}>Resolved</option>
              <option value="Closed" style={{ background: "#0b101c" }}>Closed</option>
            </select>
            <button
              onClick={handleSaveStatus}
              disabled={isSaving}
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              {isSaving ? "Saving..." : "Update Status"}
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: "12.5px", padding: "6px 16px" }}
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};

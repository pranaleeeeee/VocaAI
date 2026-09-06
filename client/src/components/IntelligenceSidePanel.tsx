import React from "react";
import { CheckCircle2, Clock, AlertCircle, ShieldCheck, HeartPulse, Brain, Sparkles, HelpCircle } from "lucide-react";
import { ConversationEntities } from "../types/index.js";

interface IntelligenceSidePanelProps {
  entities: ConversationEntities;
  confidence: number;
  intent: string;
  language: string;
  state: string;
}

export const IntelligenceSidePanel: React.FC<IntelligenceSidePanelProps> = ({
  entities,
  confidence,
  intent,
  language,
  state
}) => {
  const confPercent = Math.round(confidence * 100);

  // 3-State Information Items (Confirmed / Needs Confirmation / Missing)
  const infoItems = [
    {
      key: "customer_name",
      label: "Customer Identity",
      entity: entities.customer_name
    },
    {
      key: "reference_id",
      label: "Reference / Order ID",
      entity: entities.reference_id || entities.order_id
    },
    {
      key: "customer_phone",
      label: "Contact Phone",
      entity: entities.customer_phone
    },
    {
      key: "payment_status",
      label: "Billing / Status",
      entity: entities.payment_status
    }
  ];

  const confirmedCount = infoItems.filter(i => i.entity?.confirmed).length;

  // Health signals
  const healthSignals = [
    {
      label: "Intent Identified",
      status: intent && intent !== "general_inquiry" ? "good" : "neutral",
      text: intent ? intent.replace(/_/g, " ").toUpperCase() : "General Support"
    },
    {
      label: "Language Detected",
      status: language ? "good" : "neutral",
      text: language || "Hindi + English"
    },
    {
      label: "Critical Verification",
      status: (entities.reference_id?.confirmed || entities.order_id?.confirmed) ? "good" : (entities.reference_id || entities.order_id) ? "pending" : "missing",
      text: (entities.reference_id?.confirmed || entities.order_id?.confirmed) ? "Verified ✓" : (entities.reference_id || entities.order_id) ? "Pending Confirmation ⚠" : "Not Provided"
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* 1. Real-Time AI Confidence Meter */}
      <div className="card" style={{ padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            AI Confidence Evaluator
          </span>
          <strong style={{
            fontSize: "15px",
            color: confPercent >= 80 ? "#34d399" : confPercent >= 60 ? "#fbbf24" : "#f87171"
          }}>
            {confPercent}%
          </strong>
        </div>

        {/* Progress Bar */}
        <div style={{ height: "7px", width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: "8px" }}>
          <div style={{
            height: "100%",
            width: `${confPercent}%`,
            background: confPercent >= 80
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : confPercent >= 60
              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
              : "linear-gradient(90deg, #ef4444, #f87171)",
            borderRadius: "var(--radius-full)",
            transition: "width 0.4s ease"
          }} />
        </div>

        <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
          <span>
            {confPercent >= 80 ? "✓ High Confidence (Autonomous Action)" : confPercent >= 60 ? "⚠ Medium (Targeted Clarification)" : "🔴 Low Confidence (Escalation Boundary)"}
          </span>
        </div>
      </div>

      {/* 2. Structured Information: Confirmed / Needs Confirmation / Missing */}
      <div className="card" style={{ padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📋</span> Information Verification
          </h3>
          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "11px" }}>
            {confirmedCount} / {infoItems.length} Verified
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {infoItems.map((item) => {
            const hasVal = !!item.entity?.value;
            const isConfirmed = !!item.entity?.confirmed;

            return (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(7, 11, 22, 0.6)",
                  border: "1px solid var(--border-color)"
                }}
              >
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: hasVal ? "#fff" : "var(--text-dim)" }}>
                    {hasVal ? item.entity!.value : "Not provided"}
                  </div>
                </div>

                {isConfirmed ? (
                  <span className="badge status-confirmed" style={{ fontSize: "10px" }}>
                    <CheckCircle2 size={11} /> ✓ CONFIRMED
                  </span>
                ) : hasVal ? (
                  <span className="badge status-unconfirmed" style={{ fontSize: "10px" }}>
                    <Clock size={11} /> ⚠ NEEDS CONFIRMATION
                  </span>
                ) : (
                  <span className="badge status-missing" style={{ fontSize: "10px" }}>
                    <HelpCircle size={11} /> ? MISSING
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Conversation Health Checklist */}
      <div className="card" style={{ padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <HeartPulse size={15} color="#ec4899" />
          <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>
            Conversation Health
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {healthSignals.map((sig, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.02)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: sig.status === "good" ? "#34d399" : sig.status === "pending" ? "#fbbf24" : "#94a3b8" }}>
                  {sig.status === "good" ? "✓" : sig.status === "pending" ? "⚠" : "○"}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{sig.label}</span>
              </div>
              <strong style={{ color: "#f8fafc" }}>{sig.text}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Context Memory Box */}
      <div className="card" style={{ padding: "18px", background: "rgba(15, 23, 42, 0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
          <Brain size={15} color="#818cf8" />
          <h3 style={{ fontSize: "13px", fontWeight: 700, margin: 0 }}>
            Context Memory
          </h3>
        </div>

        <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          <div><strong>Active Intent:</strong> <span style={{ color: "#38bdf8" }}>{intent || "General Customer Inquiry"}</span></div>
          <div style={{ marginTop: "4px" }}>
            <strong>Known context:</strong>{" "}
            <span style={{ color: "#f8fafc" }}>
              {entities.customer_name?.value ? `${entities.customer_name.value} ` : ""}
              {entities.order_id?.value ? `• Ref #${entities.order_id.value} ` : ""}
              {entities.payment_status?.value ? `• ${entities.payment_status.value}` : "Inquiry initiated"}
            </span>
          </div>
          <div style={{ marginTop: "4px" }}>
            <strong>Still needed:</strong>{" "}
            <span style={{ color: "#fbbf24" }}>
              {!entities.customer_phone ? "Callback Phone Number" : "None (Fully Verified)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

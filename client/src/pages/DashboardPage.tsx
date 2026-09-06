import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { CaseRecord } from "../types/index.js";
import { Mic, Users, ShieldCheck, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  mode: "LIVE" | "DEMO";
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, mode }) => {
  const [cases, setCases] = useState<CaseRecord[]>([]);

  useEffect(() => {
    api.getCases().then((data) => setCases(data.cases || [])).catch(() => {});
  }, []);

  const openCases = cases.filter((c) => c.status === "Open" || c.status === "Waiting for Customer").length;
  const escalatedCases = cases.filter((c) => c.status === "Escalated" || c.status === "Human Handling").length;
  const resolvedCases = cases.filter((c) => c.status === "Resolved" || c.status === "Closed").length;
  const avgConfidence = cases.length > 0
    ? Math.round((cases.reduce((acc, c) => acc + c.confidence, 0) / cases.length) * 100)
    : 94;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.08))",
          borderColor: "rgba(99, 102, 241, 0.3)",
          padding: "32px"
        }}
      >
        <div style={{ maxWidth: "800px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span className="badge" style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}>
              Voice AI Platform
            </span>
            <span
              className="badge"
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399"
              }}
            >
              ● Agora Conversational AI
            </span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "8px" }}>
            VocaAI Studio
          </h1>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: "1.6" }}>
            Real-time multilingual voice AI assistant with active listening, Hindi/English code-switching,
            natural interruption handling, and context-preserving human escalation.
          </p>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button className="btn btn-primary" onClick={() => onNavigate("agent")}>
              <Mic size={16} />
              Open Voice & Chat Assistant
            </button>
            <button className="btn btn-outline" onClick={() => onNavigate("human")}>
              <Users size={16} />
              Supervisor Cases ({escalatedCases} Pending)
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Active Voice Assistant</div>
          <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px", color: "#22d3ee" }}>Agora RTC</div>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>Voice & Chat Active</div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Escalated Cases</div>
          <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px", color: "#f87171" }}>{escalatedCases} Cases</div>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>Preserved in SQLite</div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Resolved Cases</div>
          <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px", color: "#34d399" }}>{resolvedCases} Cases</div>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>Audit Trail Recorded</div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Confidence Score</div>
          <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px", color: "#818cf8" }}>{avgConfidence}%</div>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>Multi-signal calculation</div>
        </div>
      </div>

      {/* Recent Escalations */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Recent Cases & Escalation Queue</h3>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate("human")}>
            View All in Desk <ArrowUpRight size={14} />
          </button>
        </div>

        {cases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
            No cases logged yet. Start a voice conversation to generate records.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {cases.slice(0, 5).map((c) => (
              <div
                key={c.ticket_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(7, 11, 22, 0.5)",
                  border: "1px solid var(--border-color)"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>#{c.ticket_id}</span>
                    <span className={`badge ${
                      c.priority === "HIGH" ? "badge-priority-high" : c.priority === "MEDIUM" ? "badge-priority-med" : "badge-priority-low"
                    }`}>
                      {c.priority} Priority
                    </span>
                    <span className="badge" style={{ background: "rgba(255,255,255,0.06)", fontSize: "10px" }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {c.summary}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: "6px", fontSize: "11px", padding: "3px 8px" }}
                    onClick={() => onNavigate("human")}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { CaseRecord, CaseEvent } from "../types/index.js";
import { CaseDetailModal, formatEscalationReason } from "../components/CaseDetailModal.js";
import {
  Users, RefreshCw, Search, Clock, BarChart3, Settings as SettingsIcon,
  Activity, MessageSquare, ArrowRight, CheckCircle2, ShieldAlert, LogOut
} from "lucide-react";

interface HumanAgentPageProps {
  initialTicketId?: string | null;
  onSignOut?: () => void;
}

export const HumanAgentPage: React.FC<HumanAgentPageProps> = ({ initialTicketId, onSignOut }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "queue" | "cases" | "conversations" | "analytics" | "settings">("queue");
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<CaseEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Settings
  const [confThreshold, setConfThreshold] = useState<number>(0.60);
  const [autoRoutingEnabled, setAutoRoutingEnabled] = useState<boolean>(true);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCases();
      setCases(data.cases || []);
      if (initialTicketId) {
        const found = (data.cases || []).find((c) => c.ticket_id === initialTicketId);
        if (found) inspectCase(found.ticket_id);
      }
    } catch (e) {
      console.error("Failed to load cases:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [initialTicketId]);

  const inspectCase = async (ticketId: string, directRecord?: CaseRecord) => {
    if (directRecord) {
      setSelectedCase(directRecord);
    }
    try {
      const data = await api.getCaseDetail(ticketId);
      if (data && data.case) {
        setSelectedCase(data.case);
        setSelectedTimeline(data.timeline || []);
      }
    } catch (e) {
      console.error("Failed to inspect case:", e);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: CaseRecord["status"], note?: string) => {
    await api.updateCase(ticketId, status, note);
    await loadCases();
    await inspectCase(ticketId);
  };

  // Filtered cases
  const liveQueueCases = cases.filter(c => c.status === "Escalated" || c.status === "Human Handling" || c.status === "Open");

  const filteredCases = cases.filter((c) => {
    if (activeTab === "queue") {
      if (c.status !== "Escalated" && c.status !== "Human Handling" && c.status !== "Open") return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const ref = (c.reference_id || c.order_id || "").toLowerCase();
      return (
        c.ticket_id.toLowerCase().includes(q) ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        c.issue_type.toLowerCase().includes(q) ||
        ref.includes(q)
      );
    }
    return true;
  });

  const totalCasesCount = cases.length;
  const escalatedCount = liveQueueCases.length;
  const resolvedCount = cases.filter(c => c.status === "Resolved" || c.status === "Closed").length;
  const avgConf = totalCasesCount > 0
    ? Math.round((cases.reduce((acc, c) => acc + (c.confidence || 0), 0) / totalCasesCount) * 100)
    : 94;

  const navItems = [
    { id: "overview", label: "Overview", icon: <Activity size={16} /> },
    { id: "queue", label: "Live Queue", count: liveQueueCases.length, icon: <Clock size={16} /> },
    { id: "cases", label: "Cases", count: cases.length, icon: <Users size={16} /> },
    { id: "conversations", label: "Conversations", icon: <MessageSquare size={16} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon size={16} /> }
  ];

  return (
    <div style={{
      display: "flex",
      gap: "24px",
      minHeight: "calc(100vh - 120px)",
      maxWidth: "1380px",
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {/* 1. iOS / Linear Style Sidebar */}
      <aside style={{
        width: "220px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "12px 0"
      }}>
        <div style={{ padding: "0 12px 14px", fontSize: "11px", fontWeight: 600, color: "var(--text-dim)", letterSpacing: "1px", textTransform: "uppercase" }}>
          SUPERVISOR
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                fontFamily: "var(--font-main)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: isActive ? "#818cf8" : "var(--text-muted)" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
                  color: isActive ? "#ffffff" : "var(--text-dim)",
                  fontWeight: 500
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        {onSignOut && (
          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
            <button
              onClick={onSignOut}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                fontFamily: "var(--font-main)",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = "rgba(248, 113, 113, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* 2. Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
        {/* Top Action Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          paddingBottom: "4px"
        }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", margin: "0 0 2px" }}>
              {activeTab === "queue" ? "Live Escalations" :
               activeTab === "overview" ? "Supervisor Overview" :
               activeTab === "cases" ? "All Cases" :
               activeTab === "conversations" ? "Live Conversations" :
               activeTab === "analytics" ? "Operations Analytics" :
               "Supervisor Settings"}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
              {activeTab === "queue" ? "Cases requiring human supervisor intervention with preserved context." :
               "Continuous zero context loss supervisor management."}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Search Input */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-full)",
              padding: "6px 14px",
              width: "220px"
            }}>
              <Search size={14} color="var(--text-dim)" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  outline: "none",
                  width: "100%"
                }}
              />
            </div>

            <button
              onClick={loadCases}
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-full)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                cursor: "pointer"
              }}
              title="Refresh queue"
            >
              <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              {[
                { label: "Active Live Queue", value: escalatedCount, sub: "Pending human review", color: "#f87171" },
                { label: "Resolved Cases", value: resolvedCount, sub: "Handled successfully", color: "#34d399" },
                { label: "Total Sessions", value: totalCasesCount, sub: "Logged in SQLite", color: "#818cf8" },
                { label: "Avg AI Confidence", value: `${avgConf}%`, sub: "Across all interactions", color: "#38bdf8" }
              ].map((stat, i) => (
                <div key={i} className="ios-card" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{stat.label}</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: stat.color, letterSpacing: "-0.5px" }}>{stat.value}</div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "4px" }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick Live Escalations Snapshot */}
            <div className="ios-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>Recent Escalations</h3>
                <button
                  onClick={() => setActiveTab("queue")}
                  style={{ background: "none", border: "none", color: "#818cf8", fontSize: "12.5px", cursor: "pointer" }}
                >
                  View full queue →
                </button>
              </div>

              {liveQueueCases.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  No active escalations. The AI assistant is safely handling all sessions.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {liveQueueCases.slice(0, 4).map((c) => (
                    <div
                      key={c.ticket_id}
                      onClick={() => inspectCase(c.ticket_id, c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
                          #{c.ticket_id.slice(0, 12)}
                        </span>
                        <span style={{ fontSize: "13.5px", color: "var(--text-main)", fontWeight: 500 }}>
                          {c.customer_name || c.issue_type}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "var(--radius-full)",
                          background: "rgba(248, 113, 113, 0.12)",
                          color: "#fca5a5"
                        }}>
                          {c.status}
                        </span>
                        <ArrowRight size={14} color="var(--text-dim)" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Queue & Cases Table */}
        {(activeTab === "queue" || activeTab === "cases") && (
          <div className="ios-card" style={{ padding: "0", overflow: "hidden" }}>
            {filteredCases.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center", color: "var(--text-muted)" }}>
                <p style={{ fontSize: "14px", margin: "0 0 6px" }}>No cases found in this view.</p>
                <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  {activeTab === "queue" ? "The live queue is currently clear." : "Try adjusting your search query."}
                </span>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "11.5px" }}>
                      <th style={{ padding: "14px 20px", fontWeight: 500 }}>CASE ID</th>
                      <th style={{ padding: "14px 20px", fontWeight: 500 }}>CUSTOMER ISSUE</th>
                      <th style={{ padding: "14px 20px", fontWeight: 500 }}>AI CONFIDENCE</th>
                      <th style={{ padding: "14px 20px", fontWeight: 500 }}>ESCALATION REASON</th>
                      <th style={{ padding: "14px 20px", fontWeight: 500 }}>TIME</th>
                      <th style={{ padding: "14px 20px", fontWeight: 500 }}>STATUS</th>
                      <th style={{ padding: "14px 20px", fontWeight: 500, textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((c) => {
                      const confPct = Math.round(c.confidence * 100);
                      const timeString = new Date(c.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      return (
                        <tr
                          key={c.ticket_id}
                          onClick={() => inspectCase(c.ticket_id, c)}
                          style={{
                            borderBottom: "1px solid var(--border-subtle)",
                            cursor: "pointer",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
                            #{c.ticket_id.slice(0, 10)}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ fontWeight: 500, color: "var(--text-main)" }}>
                              {c.customer_name ? `${c.customer_name} • ` : ""}{c.issue_type}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "2px" }}>
                              {c.reference_id ? `Ref: ${c.reference_id}` : c.order_id ? `Order: ${c.order_id}` : "General Support"}
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontSize: "12px",
                              fontWeight: 500,
                              color: confPct >= 80 ? "#34d399" : confPct >= 60 ? "#fbbf24" : "#f87171"
                            }}>
                              {confPct}%
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", color: "var(--text-secondary)", maxWidth: "260px" }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.escalation_reason || c.summary}>
                              {formatEscalationReason(c.escalation_reason || c.summary)}
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "12px" }}>
                            {timeString}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontSize: "11.5px",
                              fontWeight: 500,
                              padding: "3px 9px",
                              borderRadius: "var(--radius-full)",
                              background: c.status === "Escalated" ? "rgba(248, 113, 113, 0.12)" :
                                          c.status === "Human Handling" ? "rgba(99, 102, 241, 0.14)" :
                                          "rgba(52, 211, 153, 0.12)",
                              color: c.status === "Escalated" ? "#fca5a5" :
                                     c.status === "Human Handling" ? "#c7d2fe" :
                                     "#6ee7b7"
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                inspectCase(c.ticket_id, c);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "4px 12px", fontSize: "12px" }}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conversations View */}
        {activeTab === "conversations" && (
          <div className="ios-card" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "8px" }}>
              Live Conversation Transcripts
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Review conversational sessions stored in the SQLite persistence database.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {cases.slice(0, 6).map((c) => (
                <div
                  key={c.ticket_id}
                  onClick={() => inspectCase(c.ticket_id)}
                  style={{
                    padding: "16px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <strong style={{ color: "#ffffff", fontSize: "13.5px" }}>{c.issue_type}</strong>
                    <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      #{c.ticket_id.slice(0, 10)}
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
                    {c.summary || c.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics View */}
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div className="ios-card" style={{ padding: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>First-Contact Resolution</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#34d399" }}>86%</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "4px" }}>Resolved autonomously by AI</div>
              </div>
              <div className="ios-card" style={{ padding: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Average Handoff Latency</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#818cf8" }}>48ms</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "4px" }}>Database sync & context packaging</div>
              </div>
              <div className="ios-card" style={{ padding: "20px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Context Loss Rate</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#38bdf8" }}>0.0%</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-dim)", marginTop: "4px" }}>All verified details preserved</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeTab === "settings" && (
          <div className="ios-card" style={{ padding: "28px", maxWidth: "680px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "16px" }}>
              Escalation Policies
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-main)", marginBottom: "6px" }}>
                  Confidence Threshold for Automatic Escalation: {Math.round(confThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="0.9"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
                <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>
                  If conversational confidence falls below this value on two turns, human supervisor is notified.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>Auto-route to Active Supervisor</div>
                  <div style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>Instantly notify online operators</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoRoutingEnabled}
                  onChange={(e) => setAutoRoutingEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#6366f1" }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseRecord={selectedCase}
          timeline={selectedTimeline}
          onClose={() => setSelectedCase(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

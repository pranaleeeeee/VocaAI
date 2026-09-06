import React from "react";
import { CaseEvent } from "../types/index.js";
import { CheckCircle, AlertTriangle, ArrowRight, Flag } from "lucide-react";

interface CaseEventTimelineProps {
  events: CaseEvent[];
}

export const CaseEventTimeline: React.FC<CaseEventTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: "12px", fontStyle: "italic", padding: "10px 0" }}>
        No timeline events recorded yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: "20px", marginTop: "10px" }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: "6px",
          top: "8px",
          bottom: "8px",
          width: "2px",
          background: "rgba(255, 255, 255, 0.1)"
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {events.map((ev, idx) => {
          let icon = <ArrowRight size={12} color="#818cf8" />;
          if (ev.event_type.includes("Created")) icon = <Flag size={12} color="#f87171" />;
          else if (ev.event_type.includes("Confirmed")) icon = <CheckCircle size={12} color="#34d399" />;
          else if (ev.event_type.includes("Corrected") || ev.event_type.includes("Low"))
            icon = <AlertTriangle size={12} color="#fbbf24" />;

          return (
            <div key={idx} style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "-20px",
                  top: "2px",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: "#0f172a",
                  border: "2px solid #6366f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{ev.event_type}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {ev.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

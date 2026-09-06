import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export const GuardrailsCard: React.FC = () => {
  const policies = [
    { name: "Medical Diagnosis & Prescriptions", status: "PROHIBITED", desc: "Refuses diagnosis; transfers to triage" },
    { name: "Emergency Responder Replacement", status: "ROUTED (112/108)", desc: "Advises official dispatch immediately" },
    { name: "Authoritative Legal / Financial Advice", status: "PROHIBITED", desc: "Explains limitations calmly" },
    { name: "Zero Fact / Action Fabrication", status: "ENFORCED", desc: "Never claims actions unperformed" }
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={16} color="#34d399" />
          <span>Active Safety Guardrails</span>
        </h3>
        <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
          Strict Policy
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {policies.map((p, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(7, 11, 22, 0.6)",
              border: "1px solid var(--border-color)",
              fontSize: "12px"
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{p.desc}</div>
            </div>
            <span
              className="badge"
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
                fontSize: "10px"
              }}
            >
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

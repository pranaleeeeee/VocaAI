import React from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { ConversationEntities } from "../types/index.js";

interface ExtractionCardProps {
  entities: ConversationEntities;
}

export const ExtractionCard: React.FC<ExtractionCardProps> = ({ entities }) => {
  const fields = [
    { key: "order_id", label: "Order ID", entity: entities.order_id },
    { key: "customer_name", label: "Customer Name", entity: entities.customer_name },
    { key: "customer_phone", label: "Contact Phone", entity: entities.customer_phone },
    { key: "payment_status", label: "Payment Status", entity: entities.payment_status },
    { key: "transaction_ref", label: "Transaction Ref", entity: entities.transaction_ref }
  ];

  const confirmedCount = fields.filter((f) => f.entity?.confirmed).length;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
          <span>📋</span> Structured Information Collected
        </h3>
        <span className="badge status-confirmed">
          {confirmedCount} / {fields.length} Confirmed
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {fields.map((f) => {
          let badgeClass = "badge status-missing";
          let badgeIcon = <AlertCircle size={12} />;
          let badgeText = "Missing";

          if (f.entity) {
            if (f.entity.confirmed) {
              badgeClass = "badge status-confirmed";
              badgeIcon = <CheckCircle2 size={12} />;
              badgeText = "✓ Confirmed";
            } else {
              badgeClass = "badge status-unconfirmed";
              badgeIcon = <Clock size={12} />;
              badgeText = "Pending Confirmation";
            }
          }

          return (
            <div
              key={f.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(7, 11, 22, 0.6)",
                border: "1px solid var(--border-color)"
              }}
            >
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {f.label}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: f.entity ? "#fff" : "var(--text-dim)" }}>
                  {f.entity ? f.entity.value : "Not provided"}
                </div>
              </div>
              <span className={badgeClass}>
                {badgeIcon}
                {badgeText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

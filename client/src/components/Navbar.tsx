import React, { useState } from "react";
import { Mic, Settings, Check } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: "LIVE" | "DEMO";
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  mode
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "68px",
      padding: "0 28px",
      background: "rgba(7, 10, 17, 0.72)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid var(--border-subtle)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      width: "100%",
      boxSizing: "border-box"
    }}>
      {/* Left: VocaAI logo + Enterprise pill */}
      <div
        onClick={() => setActiveTab("landing")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        <div style={{
          width: 34,
          height: 34,
          borderRadius: "10px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 10px rgba(99, 102, 241, 0.25)"
        }}>
          <Mic size={17} color="#ffffff" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "17px",
            fontWeight: 600,
            letterSpacing: "-0.3px",
            color: "#ffffff"
          }}>
            VocaAI
          </span>
          <span style={{
            fontSize: "11px",
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "var(--text-secondary)",
            letterSpacing: "0.2px"
          }}>
            Enterprise
          </span>
        </div>
      </div>

      {/* Center: Understated Navigation */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "rgba(255, 255, 255, 0.03)",
        padding: "4px 6px",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--border-subtle)"
      }}>
        {[
          { id: "landing", label: "Home" },
          { id: "agent", label: "Voice Assistant" },
          { id: "human", label: "Supervisor" }
        ].map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 16px",
                borderRadius: "var(--radius-full)",
                border: "none",
                background: isActive ? "rgba(255, 255, 255, 0.09)" : "transparent",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                fontFamily: "var(--font-main)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 1px 4px rgba(0, 0, 0, 0.2)" : "none"
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right: Online indicator & settings icon */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Status Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          color: "var(--text-secondary)"
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#34d399",
            boxShadow: "0 0 8px rgba(52, 211, 153, 0.6)"
          }} />
          <span style={{ fontWeight: 400 }}>Online</span>
        </div>

        {/* Settings Button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: showSettingsMenu ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            title="System Preferences"
          >
            <Settings size={15} />
          </button>

          {showSettingsMenu && (
            <div style={{
              position: "absolute",
              top: "40px",
              right: 0,
              width: "200px",
              background: "rgba(11, 16, 28, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "8px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.5)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}>
              <div style={{ padding: "6px 10px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                Voice Infrastructure
              </div>
              <div style={{
                padding: "8px 10px",
                fontSize: "12.5px",
                color: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "var(--radius-sm)",
                background: "rgba(255, 255, 255, 0.04)"
              }}>
                <span>Agora RTC Live</span>
                <Check size={14} color="#34d399" />
              </div>
              <div style={{
                padding: "8px 10px",
                fontSize: "12.5px",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span>Multilingual ConvoAI</span>
                <span style={{ fontSize: "11px", color: "#818cf8" }}>Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

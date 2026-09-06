import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar.js";
import { LandingPage } from "./pages/LandingPage.js";
import { SupportAgentPage } from "./pages/SupportAgentPage.js";
import { HumanAgentPage } from "./pages/HumanAgentPage.js";
import { SupervisorLoginPage } from "./pages/SupervisorLoginPage.js";
import { api } from "./services/api.js";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("landing");
  const [mode, setMode] = useState<"LIVE" | "DEMO">("LIVE");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const [isSupervisorAuthenticated, setIsSupervisorAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check Agora ConvoAI status
    api.getAgoraSession("init_check", "LIVE")
      .then((session) => {
        if (session && session.mode === "LIVE") {
          setMode("LIVE");
        } else {
          setMode("LIVE");
        }
      })
      .catch(() => {
        setMode("LIVE");
      });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  const handleNavigateToCase = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsSupervisorAuthenticated(true);
    setActiveTab("human");
  };

  const handleOpenSupervisor = () => {
    setActiveTab("human");
  };

  const handleStartCustomer = (initialPrompt?: string) => {
    setPendingPrompt(initialPrompt);
    setActiveTab("agent");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-primary)"
    }}>
      {/* iOS Minimal Sticky Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mode={mode}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: "20px 24px",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {activeTab === "landing" && (
          <LandingPage
            onStartCustomer={handleStartCustomer}
            onOpenSupervisor={handleOpenSupervisor}
            agoraConnected={mode === "LIVE"}
          />
        )}

        {activeTab === "agent" && (
          <SupportAgentPage
            mode={mode}
            onViewCase={handleNavigateToCase}
            initialPrompt={pendingPrompt}
          />
        )}

        {activeTab === "human" && (
          !isSupervisorAuthenticated ? (
            <SupervisorLoginPage
              onLoginSuccess={() => setIsSupervisorAuthenticated(true)}
              onBackToLanding={() => setActiveTab("landing")}
            />
          ) : (
            <HumanAgentPage
              initialTicketId={selectedTicketId}
              onSignOut={() => setIsSupervisorAuthenticated(false)}
            />
          )
        )}
      </main>

      {/* Minimal iOS Footer */}
      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "16px 28px",
        textAlign: "center",
        fontSize: "12px",
        color: "var(--text-dim)",
        background: "rgba(7, 10, 17, 0.5)",
        backdropFilter: "blur(12px)"
      }}>
        <span>VocaAI • Intelligent Multilingual Voice Assistant • Real-Time Voice Infrastructure</span>
      </footer>
    </div>
  );
};

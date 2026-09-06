import React, { useState } from "react";
import { Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";

interface SupervisorLoginPageProps {
  onLoginSuccess: () => void;
  onBackToLanding: () => void;
}

export const SupervisorLoginPage: React.FC<SupervisorLoginPageProps> = ({
  onLoginSuccess,
  onBackToLanding
}) => {
  const [email, setEmail] = useState("supervisor@vocaai.studio");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 350);
  };

  return (
    <div style={{
      maxWidth: "420px",
      margin: "48px auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }}>
      {/* Back button */}
      <button
        onClick={onBackToLanding}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          fontWeight: 500,
          padding: "4px 0",
          alignSelf: "flex-start",
          transition: "color 0.15s ease"
        }}
      >
        <ArrowLeft size={16} />
        Back to Home
      </button>

      {/* Apple / iOS Glassmorphism Login Card */}
      <div style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid var(--border-subtle)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        borderRadius: "24px",
        padding: "36px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "16px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)"
          }}>
            <Lock size={24} color="#ffffff" />
          </div>

          <h1 style={{
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.4px",
            margin: "0 0 6px",
            color: "#ffffff"
          }}>
            Supervisor Desk
          </h1>
          <p style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            margin: 0,
            lineHeight: "1.5",
            maxWidth: "300px"
          }}>
            Sign in to inspect escalated conversations and manage real-time takeovers.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "6px"
            }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                className="text-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  fontSize: "13.5px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  color: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "6px"
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                className="text-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  fontSize: "13.5px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  color: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "12px 18px",
              fontSize: "13.5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "8px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              cursor: isLoading ? "wait" : "pointer",
              boxShadow: "0 2px 12px rgba(99, 102, 241, 0.35)",
              transition: "opacity 0.15s ease",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Signing in..." : "Sign In to Supervisor Desk"}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{
          fontSize: "11.5px",
          color: "var(--text-dim)",
          textAlign: "center",
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "16px"
        }}>
          VocaAI Enterprise Console
        </div>
      </div>
    </div>
  );
};

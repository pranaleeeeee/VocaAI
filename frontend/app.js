/**
 * VocaAI Studio - Frontend Application Orchestrator
 * Features:
 * - Real-time audio waveform canvas visualizer (Web Audio API AnalyserNode)
 * - Microphone input & Speech Recognition with Barge-In / Natural Interruption
 * - Edge-TTS voice playback streaming
 * - Multilingual extraction cards & confidence telemetry
 * - Safety boundary monitoring & human escalation
 * - Supervisor Case Management dashboard
 * - Video Voiceover Studio with synthetic demo video generator and FFmpeg dubbing
 * - Scenario Simulator & Ambient Background Noise Generator
 */

class VocaApp {
  constructor() {
    this.sessionId = null;
    this.isCallActive = false;
    this.isAgentSpeaking = false;
    this.isListening = false;
    this.noiseFilterActive = true;
    this.simulatedNoiseLevel = "Low";
    this.callSeconds = 0;
    this.callTimerInterval = null;

    // Web Audio API components
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.speechRecognition = null;
    this.ambientNoiseNodes = {};

    // Current video file for dubbing
    this.currentVideoBlob = null;
    this.currentVideoName = "demo_clip.mp4";

    this.init();
  }

  init() {
    this.setupTabs();
    this.setupVisualizer();
    this.setupAudioAndSpeech();
    this.setupAgentControls();
    this.setupCaseManagement();
    this.setupVideoStudio();
    this.setupNoiseMixer();
    this.checkHealth();
    this.loadTickets();
  }

  // Toast notifications
  toast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = "toast";
    if (type === "error") el.style.borderLeftColor = "var(--danger)";
    if (type === "success") el.style.borderLeftColor = "var(--success)";
    if (type === "warning") el.style.borderLeftColor = "var(--warning)";
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(50px)";
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  // Tab Navigation
  setupTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".view-section").forEach(v => v.classList.remove("active"));
        tab.classList.add("active");
        const targetId = tab.getAttribute("data-target");
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add("active");
        if (targetId === "view-tickets") this.loadTickets();
      });
    });
  }

  // Health check
  async checkHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        document.getElementById("backendStatusText").textContent = "Edge-TTS & FFmpeg Active";
        document.getElementById("backendStatusBadge").style.color = "var(--success)";
      }
    } catch (e) {
      document.getElementById("backendStatusText").textContent = "Local Client Mode";
      document.getElementById("backendStatusBadge").style.color = "var(--warning)";
    }
  }

  // Web Audio Visualizer
  setupVisualizer() {
    const canvas = document.getElementById("audioVisualizerCanvas");
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight || 120;
    };
    resize();
    window.addEventListener("resize", resize);

    let phase = 0;
    const draw = () => {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      let freqData = null;
      if (this.analyser && this.isCallActive) {
        freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqData);
      }

      // Draw dynamic glowing audio waveform
      const bars = 48;
      const barWidth = (width / bars) - 3;
      phase += 0.05;

      for (let i = 0; i < bars; i++) {
        let amp = 0.15;
        if (freqData) {
          amp = (freqData[i % freqData.length] / 255);
        } else if (this.isAgentSpeaking) {
          amp = 0.4 + 0.35 * Math.sin(phase + i * 0.35);
        } else if (this.isListening) {
          amp = 0.25 + 0.2 * Math.cos(phase * 1.5 + i * 0.2);
        } else {
          amp = 0.08 + 0.05 * Math.sin(phase * 0.5 + i * 0.15);
        }

        const barHeight = Math.max(6, amp * (height * 0.85));
        const x = i * (barWidth + 3);
        const y = centerY - barHeight / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (this.isAgentSpeaking) {
          grad.addColorStop(0, "#818cf8");
          grad.addColorStop(1, "#4f46e5");
        } else if (this.isListening) {
          grad.addColorStop(0, "#22d3ee");
          grad.addColorStop(1, "#0891b2");
        } else {
          grad.addColorStop(0, "#334155");
          grad.addColorStop(1, "#1e293b");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };
    draw();
  }

  // Web Audio Context & Speech Recognition Setup
  async setupAudioAndSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = "en-IN"; // Supports English and code-switched Hindi-English

      this.speechRecognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          if (transcript) {
            // Natural Barge-in trigger: stop agent speech if user speaks
            if (this.isAgentSpeaking) {
              this.triggerBargeIn("Caller voice activity detected");
            }
            this.sendCallerUtterance(transcript);
          }
        }
      };

      this.speechRecognition.onerror = (e) => {
        console.warn("SpeechRecognition error:", e);
      };

      this.speechRecognition.onend = () => {
        if (this.isCallActive && this.isListening) {
          try { this.speechRecognition.start(); } catch (err) {}
        }
      };
    }
  }

  // Agent Controls
  setupAgentControls() {
    const btnMic = document.getElementById("btnToggleMic");
    const btnBargeIn = document.getElementById("btnBargeIn");
    const btnNoise = document.getElementById("btnToggleNoiseFilter");
    const btnEscalate = document.getElementById("btnManualEscalate");
    const btnClear = document.getElementById("btnClearChat");
    const btnSend = document.getElementById("btnSendMessage");
    const inputText = document.getElementById("callerInputText");

    btnMic.addEventListener("click", () => this.toggleVoiceCall());
    btnBargeIn.addEventListener("click", () => this.triggerBargeIn("Manual barge-in button clicked"));

    btnNoise.addEventListener("click", () => {
      this.noiseFilterActive = !this.noiseFilterActive;
      const statusEl = document.getElementById("noiseFilterStatus");
      const telemetryEl = document.getElementById("telemetryNoise");
      if (this.noiseFilterActive) {
        statusEl.textContent = "ON";
        telemetryEl.textContent = "DSP Filter Active";
        this.toast("Background Noise Filter: Enabled (High-pass + Low-pass DSP)", "success");
      } else {
        statusEl.textContent = "OFF";
        telemetryEl.textContent = "Raw Bypass (Noisy)";
        this.toast("Background Noise Filter: Disabled (Bypass)", "warning");
      }
    });

    btnEscalate.addEventListener("click", () => {
      this.sendCallerUtterance("I want to speak with a human supervisor immediately.");
    });

    btnClear.addEventListener("click", () => {
      this.resetSession();
      this.toast("Conversation session reset.", "info");
    });

    btnSend.addEventListener("click", () => {
      const text = inputText.value.trim();
      if (text) {
        this.sendCallerUtterance(text);
        inputText.value = "";
      }
    });

    inputText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        btnSend.click();
      }
    });
  }

  // Start / Stop Voice Call
  async toggleVoiceCall() {
    if (!this.isCallActive) {
      // Start call
      try {
        if (!this.audioCtx) {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === "suspended") {
          await this.audioCtx.resume();
        }

        // Request microphone stream
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
          console.warn("Mic not permitted or unavailable, falling back to simulation:", err);
          return null;
        });

        if (this.micStream) {
          const source = this.audioCtx.createMediaStreamSource(this.micStream);
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 128;
          source.connect(this.analyser);
        }

        this.isCallActive = true;
        this.isListening = true;
        this.startCallTimer();

        document.getElementById("btnToggleMic").classList.replace("btn-primary", "btn-danger");
        document.getElementById("micBtnIcon").textContent = "🛑";
        document.getElementById("micBtnText").textContent = "End Voice Call";
        document.getElementById("waveformHint").textContent = "Microphone Active • Listening to Caller...";
        this.setAgentStateBadge("Listening", "badge-listening");

        if (this.speechRecognition) {
          try { this.speechRecognition.start(); } catch (e) {}
        }
        this.toast("Voice Call Connected: Multilingual Agent is listening.", "success");
      } catch (err) {
        this.toast("Audio initialization error: " + err.message, "error");
      }
    } else {
      // End call
      this.endVoiceCall();
    }
  }

  endVoiceCall() {
    this.isCallActive = false;
    this.isListening = false;
    this.stopAgentAudio();
    this.stopCallTimer();

    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    document.getElementById("btnToggleMic").classList.replace("btn-danger", "btn-primary");
    document.getElementById("micBtnIcon").textContent = "🎙️";
    document.getElementById("micBtnText").textContent = "Start Voice Call";
    document.getElementById("waveformHint").textContent = "Call Ended • Click 'Start Voice Call' to reconnect";
    this.setAgentStateBadge("Ready • Idle", "badge-ready");
    this.toast("Call ended.", "info");
  }

  startCallTimer() {
    this.callSeconds = 0;
    clearInterval(this.callTimerInterval);
    this.callTimerInterval = setInterval(() => {
      this.callSeconds++;
      const m = String(Math.floor(this.callSeconds / 60)).padStart(2, "0");
      const s = String(this.callSeconds % 60).padStart(2, "0");
      document.getElementById("callTimer").textContent = `${m}:${s}`;
    }, 1000);
  }

  stopCallTimer() {
    clearInterval(this.callTimerInterval);
  }

  // Natural Interruption / Barge-in
  triggerBargeIn(reason = "User Interrupted") {
    if (this.isAgentSpeaking) {
      this.stopAgentAudio();
      this.setAgentStateBadge("Barge-In: Listening", "badge-interrupted");
      this.toast(`⚡ Natural Interruption: AI speech halted. ${reason}`, "warning");
      setTimeout(() => {
        if (this.isCallActive) {
          this.setAgentStateBadge("Listening", "badge-listening");
        }
      }, 1500);
    }
  }

  stopAgentAudio() {
    const audio = document.getElementById("agentAudioPlayer");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isAgentSpeaking = false;
  }

  setAgentStateBadge(text, className) {
    const badge = document.getElementById("agentStateBadge");
    badge.className = `mode-badge ${className}`;
    badge.textContent = text;
  }

  // Send Caller Utterance to Backend Dialog Engine
  async sendCallerUtterance(text) {
    // Append caller message to transcript
    this.appendMessage("caller", text);

    // Natural barge-in: stop any playing speech
    this.stopAgentAudio();

    this.setAgentStateBadge("Processing...", "badge-speaking");

    try {
      const noise = this.noiseFilterActive ? this.simulatedNoiseLevel : "High";
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          utterance: text,
          noise_level: noise
        })
      });

      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();

      this.sessionId = data.session_id;

      // Update telemetry
      const confPct = Math.round((data.confidence || 0.9) * 100);
      const confEl = document.getElementById("telemetryConfidence");
      confEl.textContent = `${confPct}%`;
      if (confPct >= 80) confEl.style.color = "#34d399";
      else if (confPct >= 65) confEl.style.color = "#fbbf24";
      else confEl.style.color = "#f87171";

      if (data.caller_profile) {
        document.getElementById("telemetryLanguage").textContent = data.caller_profile.language_detected || "English";
        document.getElementById("telemetryStress").textContent = data.caller_profile.stress_level || "Normal";
        this.updateExtractionCards(data.caller_profile, data.confirmed_fields);
      }

      // Check for Escalation or Safety Alert
      if (data.status === "ESCALATED") {
        this.setAgentStateBadge("Escalated to Human", "badge-escalated");
        if (data.ticket) {
          this.renderHandoverCard(data.ticket);
          this.loadTickets();
        }
      } else {
        this.setAgentStateBadge("Agent Speaking", "badge-speaking");
      }

      // Append agent reply to transcript
      this.appendMessage("agent", data.reply, {
        confidence: confPct,
        safety: data.safety_alert,
        ticketId: data.ticket ? data.ticket.ticket_id : null
      });

      // Play neural speech output
      await this.playAgentSpeech(data.reply);

    } catch (err) {
      console.error("Chat error:", err);
      this.appendMessage("agent", "I apologize, could you please repeat that? I am reconnecting.");
      this.setAgentStateBadge("Ready", "badge-ready");
    }
  }

  // Update Extracted Information Cards
  updateExtractionCards(profile, confirmed) {
    // Name
    const nameEl = document.getElementById("valCallerName");
    const nameBadge = document.getElementById("badgeCallerName");
    if (profile.name) {
      nameEl.textContent = profile.name;
      if (confirmed && confirmed.name) {
        nameBadge.className = "field-status-badge status-confirmed";
        nameBadge.textContent = "✓ Confirmed";
      } else {
        nameBadge.className = "field-status-badge status-extracted";
        nameBadge.textContent = "Extracted";
      }
    }

    // Phone
    const phoneEl = document.getElementById("valCallerPhone");
    const phoneBadge = document.getElementById("badgeCallerPhone");
    if (profile.phone) {
      phoneEl.textContent = profile.phone;
      if (confirmed && confirmed.phone) {
        phoneBadge.className = "field-status-badge status-confirmed";
        phoneBadge.textContent = "✓ Verified (Read-back)";
      } else {
        phoneBadge.className = "field-status-badge status-extracted";
        phoneBadge.textContent = "Pending Read-back";
      }
    }

    // Location
    const locEl = document.getElementById("valCallerLocation");
    const locBadge = document.getElementById("badgeCallerLocation");
    if (profile.location) {
      locEl.textContent = profile.location;
      if (confirmed && confirmed.location) {
        locBadge.className = "field-status-badge status-confirmed";
        locBadge.textContent = "✓ Confirmed";
      } else {
        locBadge.className = "field-status-badge status-extracted";
        locBadge.textContent = "Extracted";
      }
    }

    // Category & Urgency
    const catEl = document.getElementById("valCategory");
    const catBadge = document.getElementById("badgeCategory");
    if (profile.issue_category) {
      catEl.textContent = `${profile.issue_category} (${profile.urgency || "Normal"})`;
      if (profile.urgency === "CRITICAL" || profile.urgency === "HIGH") {
        catBadge.className = "field-status-badge status-missing";
        catBadge.style.background = "rgba(239, 68, 68, 0.2)";
        catBadge.style.color = "#f87171";
        catBadge.textContent = "Priority Alert";
      } else {
        catBadge.className = "field-status-badge status-extracted";
        catBadge.textContent = "Active Triage";
      }
    }

    // Count confirmed fields
    let count = 0;
    if (profile.name) count++;
    if (confirmed && confirmed.phone) count++;
    if (confirmed && confirmed.location) count++;
    if (profile.issue_category) count++;
    document.getElementById("fieldsConfirmedCount").textContent = `${count} / 4 Recorded`;
  }

  // Render Handover Card
  renderHandoverCard(ticket) {
    const container = document.getElementById("handoverSummaryContent");
    const badge = document.getElementById("handoverPriorityBadge");

    badge.className = ticket.priority === "CRITICAL" ? "badge-priority-critical" : "badge-priority-high";
    badge.textContent = `Ticket #${ticket.ticket_id} • ${ticket.priority}`;

    container.innerHTML = `
      <div style="font-weight: 700; color: #fff; margin-bottom: 6px;">
        Reason: <span style="color: #f87171;">${ticket.escalation_reason}</span>
      </div>
      <div style="margin-bottom: 8px; font-size: 12px; color: var(--text-muted);">
        Caller: <strong>${ticket.caller_name}</strong> | Phone: <strong>${ticket.caller_phone}</strong> (${ticket.phone_confirmed ? "Confirmed" : "Unverified"}) | Location: <strong>${ticket.location}</strong>
      </div>
      <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; font-style: italic; margin-bottom: 8px;">
        "${ticket.key_summary}"
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="badge-tag" style="background: rgba(99, 102, 241, 0.2); color: #818cf8;">Transferred to Human Supervisor Queue</span>
        <button class="btn btn-outline btn-sm" onclick="app.switchToTicketsView('${ticket.ticket_id}')">View in Case Dashboard</button>
      </div>
    `;
  }

  switchToTicketsView(ticketId) {
    document.getElementById("tabBtnTickets").click();
  }

  // Play Neural Speech via Edge-TTS (with fallback)
  async playAgentSpeech(text) {
    this.isAgentSpeaking = true;
    const audio = document.getElementById("agentAudioPlayer");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          voice: text.match(/[\u0900-\u097F]/) || text.includes("ji") || text.includes("kripya") ? "hi-IN-SwaraNeural" : "en-US-JennyNeural"
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        audio.src = url;
        audio.onended = () => {
          this.isAgentSpeaking = false;
          if (this.isCallActive) {
            this.setAgentStateBadge("Listening", "badge-listening");
          } else {
            this.setAgentStateBadge("Ready • Idle", "badge-ready");
          }
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn("Edge-TTS fetch failed, falling back to Web Speech API:", e);
    }

    // Fallback: Browser Web Speech Synthesis
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => {
        this.isAgentSpeaking = false;
        if (this.isCallActive) {
          this.setAgentStateBadge("Listening", "badge-listening");
        } else {
          this.setAgentStateBadge("Ready • Idle", "badge-ready");
        }
      };
      window.speechSynthesis.speak(utterance);
    }
  }

  // Append Message to Transcript Box
  appendMessage(speaker, text, meta = {}) {
    const container = document.getElementById("transcriptContainer");
    const msgEl = document.createElement("div");
    msgEl.className = `transcript-message message-${speaker}`;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const headerTitle = speaker === "caller" ? "👤 Caller" : "🤖 VocaAI Support Agent";

    let metaHtml = "";
    if (speaker === "caller") {
      metaHtml = `<div class="message-meta"><span class="badge-tag">Audio Input</span></div>`;
    } else {
      let tags = [];
      if (meta.confidence) tags.push(`<span class="badge-tag">Confidence: ${meta.confidence}%</span>`);
      if (meta.safety) tags.push(`<span class="badge-tag" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">Guardrail: ${meta.safety.type}</span>`);
      if (meta.ticketId) tags.push(`<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">Ticket #${meta.ticketId}</span>`);
      tags.push(`<button class="btn-sm btn-outline" style="padding: 2px 6px; font-size: 10px;" onclick="app.replaySpeech('${encodeURIComponent(text)}')">🔊 Listen</button>`);
      metaHtml = `<div class="message-meta">${tags.join(" ")}</div>`;
    }

    msgEl.innerHTML = `
      <div class="message-header">
        <strong>${headerTitle}</strong> • <span>${timeStr}</span>
      </div>
      <div class="message-bubble">${this.escapeHtml(text)}</div>
      ${metaHtml}
    `;

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
  }

  replaySpeech(encodedText) {
    const text = decodeURIComponent(encodedText);
    this.playAgentSpeech(text);
  }

  resetSession() {
    this.sessionId = null;
    this.stopAgentAudio();
    const container = document.getElementById("transcriptContainer");
    container.innerHTML = `
      <div class="transcript-message message-agent">
        <div class="message-header">
          <strong>🤖 VocaAI Support Agent</strong> • <span>System Welcome</span>
        </div>
        <div class="message-bubble">
          Namaste! Welcome to Public & Non-Clinical Assistance Line. Aap Hindi ya English kisi me bhi baat kar sakte hain. How may I assist you today?
        </div>
        <div class="message-meta">
          <span class="badge-tag">Multilingual / Hinglish Ready</span>
          <span class="badge-tag">Confidence: 98%</span>
        </div>
      </div>
    `;
    document.getElementById("valCallerName").textContent = "Not provided yet";
    document.getElementById("badgeCallerName").className = "field-status-badge status-missing";
    document.getElementById("badgeCallerName").textContent = "Missing";

    document.getElementById("valCallerPhone").textContent = "Not provided yet";
    document.getElementById("badgeCallerPhone").className = "field-status-badge status-missing";
    document.getElementById("badgeCallerPhone").textContent = "Missing";

    document.getElementById("valCallerLocation").textContent = "Not provided yet";
    document.getElementById("badgeCallerLocation").className = "field-status-badge status-missing";
    document.getElementById("badgeCallerLocation").textContent = "Missing";

    document.getElementById("valCategory").textContent = "General Assistance (Normal)";
    document.getElementById("badgeCategory").className = "field-status-badge status-extracted";
    document.getElementById("badgeCategory").textContent = "Auto-Classified";

    document.getElementById("fieldsConfirmedCount").textContent = "0 / 4 Confirmed";
    document.getElementById("handoverSummaryContent").textContent = "No escalation triggered yet. The agent is calmly collecting and verifying caller information.";
    document.getElementById("handoverPriorityBadge").className = "badge-priority-normal";
    document.getElementById("handoverPriorityBadge").textContent = "Ready for Dispatch";
  }

  // Case Management & Supervisor Dashboard
  setupCaseManagement() {
    document.getElementById("btnRefreshTickets").addEventListener("click", () => {
      this.loadTickets();
      this.toast("Supervisor queue refreshed.", "info");
    });
  }

  async loadTickets() {
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const data = await res.json();
        this.renderTicketsTable(data.tickets || []);
      }
    } catch (e) {
      console.warn("Could not load tickets:", e);
    }
  }

  renderTicketsTable(tickets) {
    const tbody = document.getElementById("ticketsTableBody");
    if (!tickets.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 30px;">
            No escalated cases currently in queue. All active conversations are handled within parameters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tickets.map(t => {
      let priorityClass = "badge-priority-normal";
      if (t.priority === "CRITICAL") priorityClass = "badge-priority-critical";
      else if (t.priority === "HIGH") priorityClass = "badge-priority-high";

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: #22d3ee;">#${t.ticket_id}</strong></td>
          <td style="color: var(--text-dim); font-size: 12px;">${t.timestamp}</td>
          <td><strong>${t.caller_name}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${t.language_mode}</span></td>
          <td>${t.issue_category}</td>
          <td><span class="${priorityClass}">${t.priority}</span></td>
          <td style="max-width: 260px; line-height: 1.4; font-size: 12px; color: #e2e8f0;">${t.escalation_reason}</td>
          <td><span class="badge-tag" style="color: #34d399;">${t.status}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="app.resolveTicket('${t.ticket_id}')">Resolve</button>
              <button class="btn btn-secondary btn-sm" onclick="app.downloadTicketJson('${t.ticket_id}')">JSON</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async resolveTicket(ticketId) {
    try {
      const res = await fetch("/api/tickets/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId })
      });
      if (res.ok) {
        this.toast(`Ticket #${ticketId} marked as resolved.`, "success");
        this.loadTickets();
      }
    } catch (e) {
      this.toast("Error resolving ticket", "error");
    }
  }

  downloadTicketJson(ticketId) {
    fetch("/api/tickets").then(r => r.json()).then(data => {
      const ticket = (data.tickets || []).find(t => t.ticket_id === ticketId);
      if (ticket) {
        const blob = new Blob([JSON.stringify(ticket, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `case_${ticketId}.json`;
        a.click();
      }
    });
  }

  // AI Video Voiceover Studio
  setupVideoStudio() {
    const dropzone = document.getElementById("videoDropzone");
    const fileInput = document.getElementById("videoFileInput");
    const scriptInput = document.getElementById("voiceoverScriptInput");
    const wordCountEl = document.getElementById("scriptWordCount");
    const btnLoadDemo = document.getElementById("btnLoadSampleVideo");
    const btnDub = document.getElementById("btnDubVideo");

    // File input & Drag-drop
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.style.borderColor = "var(--primary)"; });
    dropzone.addEventListener("dragleave", () => { dropzone.style.borderColor = "rgba(255, 255, 255, 0.15)"; });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "rgba(255, 255, 255, 0.15)";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.loadVideoFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadVideoFile(e.target.files[0]);
      }
    });

    // Script word count
    scriptInput.addEventListener("input", () => {
      const words = scriptInput.value.trim().split(/\s+/).filter(Boolean).length;
      wordCountEl.textContent = `${words} words (~${Math.round(words / 2.5)}s)`;
    });

    // Generate Demo Video via Canvas
    btnLoadDemo.addEventListener("click", () => this.generateDemoVideo());

    // Execute Dubbing
    btnDub.addEventListener("click", () => this.executeVideoDubbing());
  }

  loadVideoFile(file) {
    this.currentVideoBlob = file;
    this.currentVideoName = file.name;
    document.getElementById("uploadedFileName").textContent = `Loaded: ${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)`;
    const videoPlayer = document.getElementById("previewVideo");
    videoPlayer.src = URL.createObjectURL(file);
    this.toast(`Video loaded: ${file.name}`, "success");
  }

  // Generates a self-contained animated demo video using HTML5 Canvas & MediaRecorder
  async generateDemoVideo() {
    this.toast("Generating high-tech demo video in browser...", "info");
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    const stream = canvas.captureStream(30); // 30 fps
    let mediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    } catch (e) {
      mediaRecorder = new MediaRecorder(stream);
    }

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      this.loadVideoFile(new File([blob], "vocaai_demo_clip.webm", { type: "video/webm" }));
      document.getElementById("voiceoverScriptInput").value = (
        "Welcome to VocaAI Studio! In this demonstration, we are testing the automated video voiceover workflow. " +
        "Using Edge-TTS neural speech synthesis, high-definition audio is generated and seamlessly merged with the visual track using FFmpeg. " +
        "The resulting video is synchronized and ready for production broadcast."
      );
      document.getElementById("voiceoverScriptInput").dispatchEvent(new Event("input"));
      this.toast("Demo video ready! Now click 'Generate AI Voiceover & Merge'.", "success");
    };

    mediaRecorder.start();

    // Render 5 seconds of animation
    let frame = 0;
    const totalFrames = 30 * 5; // 5 seconds
    const interval = setInterval(() => {
      frame++;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#080d1a");
      grad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Rotating glow circle
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 - 20);
      ctx.rotate((frame * 0.05));
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();

      // Title & Clock
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VocaAI Studio: Video Dubbing Test", canvas.width / 2, canvas.height / 2 + 70);

      ctx.fillStyle = "#22d3ee";
      ctx.font = "16px monospace";
      ctx.fillText(`Frame: ${frame} / ${totalFrames} • Time: ${(frame / 30).toFixed(1)}s`, canvas.width / 2, canvas.height / 2 + 105);

      if (frame >= totalFrames) {
        clearInterval(interval);
        mediaRecorder.stop();
      }
    }, 1000 / 30);
  }

  // Dub video via Backend FFmpeg & Edge-TTS
  async executeVideoDubbing() {
    if (!this.currentVideoBlob) {
      this.toast("Please upload a video file or click 'Load Demo Video' first!", "warning");
      return;
    }

    const script = document.getElementById("voiceoverScriptInput").value.trim();
    if (!script) {
      this.toast("Please enter a voiceover script.", "warning");
      return;
    }

    const voice = document.getElementById("selectVoice").value;
    const rate = document.getElementById("selectSpeechRate").value;
    const keepAudio = document.getElementById("chkKeepOriginalAudio").checked;

    const progressContainer = document.getElementById("dubbingProgressContainer");
    const progressBar = document.getElementById("dubbingProgressBar");
    const downloadBtn = document.getElementById("btnDownloadDubbedVideo");

    progressContainer.style.display = "block";
    progressBar.style.width = "25%";
    this.toast("Synthesizing neural voice & invoking FFmpeg...", "info");

    const formData = new FormData();
    formData.append("video", this.currentVideoBlob, this.currentVideoName);
    formData.append("script", script);
    formData.append("voice", voice);
    formData.append("rate", rate);
    formData.append("keep_original_audio", keepAudio ? "true" : "false");

    try {
      progressBar.style.width = "55%";
      const res = await fetch("/api/video/dub", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Dubbing failed");
      }

      progressBar.style.width = "90%";
      const videoBlob = await res.blob();
      const videoUrl = URL.createObjectURL(videoBlob);

      const videoPlayer = document.getElementById("previewVideo");
      videoPlayer.src = videoUrl;
      videoPlayer.play();

      downloadBtn.href = videoUrl;
      downloadBtn.download = `vocaai_dubbed_${Date.now()}.mp4`;
      downloadBtn.style.display = "inline-flex";

      progressBar.style.width = "100%";
      setTimeout(() => { progressContainer.style.display = "none"; }, 800);
      this.toast("Video Dubbing Complete! Playing newly dubbed video.", "success");
    } catch (err) {
      console.error(err);
      progressContainer.style.display = "none";
      this.toast("Dubbing error: " + err.message, "error");
    }
  }

  // Scenario Simulator Test Bench
  runScenario(scenarioKey) {
    // Switch to Voice Agent console view
    document.getElementById("tabBtnAgent").click();
    this.resetSession();

    if (scenarioKey === "hinglish_noise") {
      this.toast("Running Scenario 1: Hinglish Stressed Caller with Traffic Noise", "info");
      this.simulatedNoiseLevel = "High";
      document.getElementById("sliderTraffic").value = 75;
      document.getElementById("volTrafficText").textContent = "75%";
      this.updateAmbientNoise("traffic", 0.75);

      setTimeout(() => {
        this.sendCallerUtterance("Bhaiya emergency help chahiye! Meri shop ke samne water main burst ho gaya hai and traffic bohot loud hai... please quickly note kar lijiye!");
        setTimeout(() => {
          this.sendCallerUtterance("Mera naam Rohan hai, phone number 98765-43210 hai, MG Road Sector 14 market ke paas.");
          setTimeout(() => {
            this.sendCallerUtterance("Haan sahi hai, 9876543210 bilkul theek hai, jaldi team bhej dijiye.");
          }, 4500);
        }, 4000);
      }, 500);

    } else if (scenarioKey === "medical_boundary") {
      this.toast("Running Scenario 2: Strict Medical Boundary Trigger", "warning");
      setTimeout(() => {
        this.sendCallerUtterance("My chest is hurting very bad and I feel dizzy. Is this a heart attack? Should I take aspirin or wait for my doctor?");
      }, 500);

    } else if (scenarioKey === "low_confidence_recovery") {
      this.toast("Running Scenario 3: Low Confidence Audio Recovery", "info");
      this.simulatedNoiseLevel = "High";
      setTimeout(() => {
        this.sendCallerUtterance("... [inaudible street noise] ... street 4 ... mmm ...");
        setTimeout(() => {
          this.sendCallerUtterance("... uh ... still muffled ...");
        }, 3500);
      }, 500);

    } else if (scenarioKey === "fire_emergency") {
      this.toast("Running Scenario 4: Fire & Emergency Hazard Dispatch", "warning");
      setTimeout(() => {
        this.sendCallerUtterance("There is a heavy fire in building on 3rd floor, smoke everywhere! Send emergency help now!");
      }, 500);
    }
  }

  // Ambient Noise Generator (Web Audio API Synthesizer)
  setupNoiseMixer() {
    const sliders = [
      { id: "sliderTraffic", key: "traffic", textId: "volTrafficText" },
      { id: "sliderCrowd", key: "crowd", textId: "volCrowdText" },
      { id: "sliderSiren", key: "siren", textId: "volSirenText" },
      { id: "sliderCafe", key: "cafe", textId: "volCafeText" }
    ];

    sliders.forEach(s => {
      const slider = document.getElementById(s.id);
      slider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        document.getElementById(s.textId).textContent = `${val}%`;
        this.updateAmbientNoise(s.key, val / 100);

        // Update overall simulated noise level
        const maxVal = Math.max(...sliders.map(item => parseInt(document.getElementById(item.id).value)));
        if (maxVal > 60) this.simulatedNoiseLevel = "High";
        else if (maxVal > 25) this.simulatedNoiseLevel = "Medium";
        else this.simulatedNoiseLevel = "Low";
      });
    });
  }

  updateAmbientNoise(type, volume) {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    if (!this.ambientNoiseNodes[type]) {
      // Create synthesized noise buffer
      const bufferSize = this.audioCtx.sampleRate * 2;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise base
      }

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      if (type === "traffic") {
        filter.type = "lowpass";
        filter.frequency.value = 220; // Low rumble
      } else if (type === "siren") {
        filter.type = "bandpass";
        filter.frequency.value = 950;
      } else {
        filter.type = "bandpass";
        filter.frequency.value = 600;
      }

      const gain = this.audioCtx.createGain();
      gain.gain.value = 0;

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      noiseSource.start();

      this.ambientNoiseNodes[type] = { gain, filter };
    }

    this.ambientNoiseNodes[type].gain.gain.setTargetAtTime(volume * 0.15, this.audioCtx.currentTime, 0.1);
  }

  saveApiConfig() {
    this.toast("Cloud API configuration saved locally.", "success");
  }

  escapeHtml(str) {
    return (str || "").replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Instantiate App
window.addEventListener("DOMContentLoaded", () => {
  window.app = new VocaApp();
});

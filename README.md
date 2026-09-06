# VocaAI Studio: Enterprise Real-Time Multilingual Voice AI & Video Voiceover Platform

**VocaAI Studio** is a unified, production-inspired platform combining:
1. **Real-Time Multilingual Voice AI Support Agent & Console**: Built for high-stress, noisy customer assistance, public information, or non-clinical support lines with official Agora Conversational AI integration.
2. **Deterministic Conversation Orchestrator & Case Management**: Explicit state machine, user correction handling, critical detail confirmation, prioritized question flow, measurable confidence scoring, strict safety guardrails, and persistent SQLite case desk with audit timeline.
3. **AI Video Voiceover Studio**: Upload videos or generate synthetic clips in-browser, edit multilingual voiceover scripts, select neural AI voices (Edge-TTS), and merge synchronized audio using FFmpeg.

---

## 🚀 Core Architectural Capabilities

### 1. Distinct Agora RTC Transport vs. VocaAI Intelligence
- **Agora Layer**: Real-time voice communication layer utilizing the official Agora CLI (`agora_bin\agora.exe` v0.2.8) and server-side token generation via official `agora-token` (`ConvoAITokenBuilder`, `RtcTokenBuilder`).
- **VocaAI Layer**: Central deterministic orchestrator operating on an explicit state machine:
  `IDLE` $\rightarrow$ `CONNECTING` $\rightarrow$ `GREETING` $\rightarrow$ `IDENTIFYING_INTENT` $\rightarrow$ `COLLECTING_INFORMATION` $\rightarrow$ `CONFIRMING` $\rightarrow$ `RESOLVING` $\rightarrow$ `CLARIFYING` $\rightarrow$ `ESCALATING` $\rightarrow$ `TICKET_CREATED` $\rightarrow$ `HUMAN_HANDOFF` $\rightarrow$ `COMPLETED`.
- **Truthful Status Labeling**: Accurately displays `● LIVE — Agora Conversational AI` when external RTC credentials and ConvoAI channels are active, or `● DEMO MODE — Voice services not configured` when running local evaluation mode (with the exact same backend state machine, safety guardrails, SQLite database, dynamic ticketing, and Human Agent Dashboard).

### 2. Multilingual & Code-Switched Voice Interaction
- Comprehends code-switched Hindi-English (**Hinglish**) alongside pure Hindi (Devanagari & Latin transliteration) and pure English.
- Smoothly handles callers beginning in Hindi (*"मेरा payment नहीं हुआ है..."*) and seamlessly switching to English (*"Actually money has been deducted but order is not confirmed"*).

### 3. Natural Interruption Handling (Automatic Barge-In)
- Real-time voice activity detection halts active AI speech immediately when the caller speaks.
- The state transitions from AI speaking back to `COLLECTING_INFORMATION` without losing conversation state.

### 4. User Correction Handling & Detail Confirmation
- When a caller corrects an extracted entity (e.g. Order ID `458921` $\rightarrow$ `458291`), the old entity is invalidated, confirmation status is reset, and the agent proactively confirms the updated value.
- Critical fields (such as Order ID and Contact Phone) trigger explicit read-back prompts before confirmation.

### 5. Prioritized Question Flow
- Asks for missing critical info sequentially (e.g. Order ID, Contact Phone, Issue details) and **never re-asks** for information already provided by the caller.

### 6. Deterministic Confidence Scoring
Calculated through measurable, weighted signals:
- STT Clarity (weight 0.35)
- Intent & Entity Clarity (weight 0.25)
- Historical Consistency across turns (weight 0.20)
- Confirmation Ratio & Corrections (weight 0.20)
- **Thresholds**: $\ge 80\%$ (High), $65\% - 79\%$ (Borderline / targeted clarification), $< 65\%$ (Low). Consecutive low-confidence turns ($\ge 2$) trigger automatic human handover.

### 7. Strict Safety Boundaries & Guardrails
- **No Medical Diagnosis**: Prohibits clinical evaluation and prescription advice. Directly provides ambulance hotlines (108 / 112) and escalates to licensed human triage.
- **No Replacement of Emergency Responders**: Life-critical emergencies (fire, active crimes, severe accidents) trigger immediate emergency responder dispatch guidance and priority-1 escalation.
- **No Legal/Financial Authoritative Advice**: Enforces policy boundaries and routes to human specialists.
- **Zero Hallucination**: Emits only verified facts.

### 8. SQLite Case Desk with Audit Event Timeline
- Persistent storage in `vocaai.sqlite` with 4 tables: `cases`, `conversations`, `messages`, and `case_events`.
- Dynamic ticket format: `TKT-YYYY-XXXX`.
- Preserves full transcript, confirmed vs. unconfirmed entities, language mode, confidence score, and AI summary.
- Interactive supervisor drawer with status updating (`Human Handling`, `Resolved`, `Closed`) and resolution note logging.

### 9. AI Video Voiceover Studio
- In-browser synthetic test video generator (`HTML5 Canvas` + `MediaRecorder`).
- Multi-language neural voice selection (Hindi Swara/Madhur, English Neerja/Jenny/Guy, Spanish, French, etc.).
- Audio-video multiplexing via **FFmpeg**.
- Live preview player and single-click dubbed video download.

---

## 🛠️ Architecture Diagram

```text
[Caller Microphone / RTC Stream]
               │
               ▼
   [Agora ConvoAI / RTC Channel]
               │
               ▼
[VocaAI Studio State Orchestrator] ──> [Deterministic Confidence Evaluator]
               │
               ├─────────────────────────┬─────────────────────────┐
               ▼                         ▼                         ▼
   [Entity Extractor]          [Safety Guardrails]       [Confirmation Manager]
   - Order ID, Phone, Intent   - Anti-Medical (108/112)  - Read-Back Prompts
   - Correction Invalidation   - Emergency Routing       - User Correction Reset
               │                         │                         │
               └─────────────────────────┴─────────────────────────┘
                                         │
                                         ▼
                     [SQLite Persistent Store (vocaai.sqlite)]
                     - cases (TKT-YYYY-XXXX)
                     - messages & conversations
                     - case_events (Audit Timeline)
                                         │
                                         ▼
                           [Human Agent Supervisor Desk]
```

---

## 🏃 Running VocaAI Studio Locally

### 1. Single-Click Launch (Recommended)
Double-click [`start.bat`](start.bat) in the project root. It will:
1. Ensure dependencies are installed in `server/`.
2. Launch the VocaAI Studio Node.js server on `http://127.0.0.1:5000`.
3. Open your browser automatically to `http://127.0.0.1:5000`.

### 2. Manual Launch
```powershell
cd server
npm start
```
The server serves the compiled React frontend client from `client/dist` and handles API requests and WebSockets on port 5000.

### 3. Agora Diagnostics Script
To test your Agora CLI installation and ConvoAI project readiness:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-agora.ps1
```

### 4. Automated Backend Test Suite
Run the 14-point automated test suite:
```powershell
cd server
npm test
```
All 14 specification tests will execute and validate:
- Agora CLI binary detection and authentication
- Agora RTC token builder
- Hindi & Hinglish extraction
- User correction & confirmation reset
- Automatic barge-in interruption
- Low confidence recovery and escalation
- Strict medical and emergency hazard guardrails
- SQLite case insertion and case event timeline logging
- Human agent case resolution and note persistence

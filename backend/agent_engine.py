"""
VocaAI Studio - Real-Time Multilingual Voice AI Agent Engine
Specialized for customer assistance, public information, and non-clinical support lines.
Features:
- Multilingual & Code-Switched comprehension (Hinglish, Hindi, English, Spanish)
- Prioritized question flow (Urgency -> Contact -> Location -> Issue details)
- Repetition & confirmation of critical details (phone, address)
- Low-confidence detection & ambiguity recovery
- Background noise resilience & adaptive prompting
- Strict safety boundaries (no medical diagnosis, emergency responder routing, no legal/financial advice)
- Human escalation with context preservation and ticketing
"""

import re
import uuid
import datetime
from typing import Dict, Any, List, Optional

class AgentEngine:
    def __init__(self):
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.tickets: List[Dict[str, Any]] = []

    def get_or_create_session(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        if not session_id or session_id not in self.conversations:
            session_id = str(uuid.uuid4())[:8]
            self.conversations[session_id] = {
                "session_id": session_id,
                "created_at": datetime.datetime.now().isoformat(),
                "history": [],
                "state": "COLLECTING",  # COLLECTING, CONFIRMING, ESCALATED, RESOLVED
                "escalated": False,
                "escalation_reason": None,
                "ticket_id": None,
                "low_confidence_count": 0,
                "consecutive_low_conf": 0,
                "caller_profile": {
                    "name": None,
                    "phone": None,
                    "location": None,
                    "issue_category": "General Public Inquiry",
                    "urgency": "Normal",  # Normal, High, Critical
                    "language_detected": "English",
                    "code_switched": False,
                    "noise_level": "Low",
                    "stress_level": "Moderate"
                },
                "confirmed_fields": {
                    "phone": False,
                    "location": False,
                    "name": False
                },
                "last_question": "greeting"
            }
        return self.conversations[session_id]

    def check_safety_boundaries(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Enforce strict safety restrictions:
        1. Must not provide medical diagnosis or treatment advice.
        2. Must not replace trained emergency responders (provide hotline numbers).
        3. Must not provide legal, financial or authoritative advice.
        """
        text_lower = text.lower()

        # 1. Life-Threatening Emergency / Replacement of First Responders
        emergency_triggers = [
            "fire in building", "aag lagi", "building on fire", "smoke in room", 
            "someone is attacking", "active shooter", "intruder", "drowning", 
            "severe accident", "car crash", "trapped inside", "gas leak explosion"
        ]
        for trigger in emergency_triggers:
            if trigger in text_lower:
                return {
                    "type": "EMERGENCY_RESPONDER_TRIGGER",
                    "severity": "CRITICAL",
                    "response_text": (
                        "This sounds like an immediate emergency! Please ensure your safety first. "
                        "If you are in immediate danger, please dial 112 (or 108 / 911) right now for first responders. "
                        "I am simultaneously escalating your call with highest priority to our emergency response coordinator."
                    ),
                    "response_hindi": (
                        "Yeh ek aapatkaleen sthiti lagti hai! Kripya pehle apni suraksha dekhein. "
                        "Turant 112 ya 108 par emergency responders ko call karein. "
                        "Main turant aapki call hamare emergency coordinator ko transfer kar raha hoon."
                    ),
                    "reason": "Immediate life-safety hazard detected. Routed to official emergency numbers and human coordinator."
                }

        # 2. Medical Diagnosis & Clinical Advice Restriction
        medical_triggers = [
            "chest pain", "heart attack", "sine me dard", "stroke", "paralysis", 
            "coughing blood", "blood vomit", "should i take aspirin", "medicine dose", 
            "what illness", "diagnose", "poison", "overdose", "breathing stopped", 
            "unconscious", "behosh"
        ]
        for trigger in medical_triggers:
            if trigger in text_lower:
                return {
                    "type": "MEDICAL_SAFETY_TRIGGER",
                    "severity": "HIGH",
                    "response_text": (
                        "I want to make sure you get the right care, but as an automated assistant, "
                        "I cannot provide medical diagnosis, clinical evaluation, or prescribe treatment. "
                        "For medical emergencies, please call ambulance services at 108 or 112 immediately. "
                        "I am transferring you to a licensed medical triage staff member right away."
                    ),
                    "response_hindi": (
                        "Aapki sehat sabse zaroori hai, lekin main koi medical diagnosis ya dawai ki salah nahi de sakta. "
                        "Kripya turant ambulance helpline 108 ya 112 par call karein. "
                        "Main aapko turant hamari human medical triage team se jod raha hoon."
                    ),
                    "reason": "Medical inquiry/symptom check. Prohibited from clinical diagnosis; transferred to human triage."
                }

        # 3. Legal & Financial Authoritative Advice
        legal_financial_triggers = [
            "should i sue", "file lawsuit", "legal counsel", "bail bond", 
            "invest all money", "guaranteed profit", "tax evasion"
        ]
        for trigger in legal_financial_triggers:
            if trigger in text_lower:
                return {
                    "type": "LEGAL_FINANCIAL_BOUNDARY",
                    "severity": "MODERATE",
                    "response_text": (
                        "I cannot provide legal, financial, or regulatory advice. "
                        "I can connect you to our verified public affairs directory or transfer you to a human officer."
                    ),
                    "response_hindi": (
                        "Main koi kanooni ya aarthik salah nahi de sakta. "
                        "Main aapko kanooni sahayata vibhag ke human representative se connect kar deta hoon."
                    ),
                    "reason": "Authoritative legal or financial guidance requested outside scope."
                }

        return None

    def detect_multilingual_aspects(self, text: str) -> Dict[str, Any]:
        """Detect language, code-switching (Hinglish/Spanish/English), and caller sentiment."""
        text_lower = text.lower()
        hindi_keywords = [
            "mera", "meri", "naam", "bhaiya", "madad", "chahiye", "kripya", "jaldi",
            "pata", "nahi", "kaise", "bohot", "dard", "pareshani", "kahan", "hai", 
            "dhuan", "pani", "stithi", "aag", "gaadi", "sadak", "ghar", "kripa"
        ]
        spanish_keywords = [
            "hola", "ayuda", "por favor", "necesito", "nombre", "calle", "donde", "gracias"
        ]

        hindi_matches = sum(1 for kw in hindi_keywords if re.search(r'\b' + kw + r'\b', text_lower))
        spanish_matches = sum(1 for kw in spanish_keywords if re.search(r'\b' + kw + r'\b', text_lower))

        english_words = sum(1 for word in text_lower.split() if word not in hindi_keywords and word not in spanish_keywords)

        if hindi_matches >= 2 and english_words >= 2:
            lang = "Hinglish (Hindi + English Code-Switched)"
            is_code_switch = True
        elif hindi_matches >= 2:
            lang = "Hindi"
            is_code_switch = False
        elif spanish_matches >= 2 and english_words >= 2:
            lang = "Spanglish (Spanish + English Code-Switched)"
            is_code_switch = True
        elif spanish_matches >= 2:
            lang = "Spanish"
            is_code_switch = False
        else:
            lang = "English"
            is_code_switch = False

        # Stress level detection
        stress_indicators = ["please help", "urgent", "emergency", "jaldi", "fast", "scared", "can't breathe", "lost", "bohot dar", "immediately"]
        stress_count = sum(1 for ind in stress_indicators if ind in text_lower)
        if stress_count >= 2 or "emergency" in text_lower or "jaldi" in text_lower:
            stress_level = "High / Distressed"
        elif stress_count == 1:
            stress_level = "Elevated"
        else:
            stress_level = "Calm / Moderate"

        return {
            "language": lang,
            "code_switched": is_code_switch,
            "stress_level": stress_level
        }

    def extract_information(self, text: str, current_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract caller name, phone number, location, and issue details."""
        extracted = {}

        # 1. Phone number extraction (7-12 digits with optional dashes/spaces)
        phone_match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b|\b\d{5}[-\s]\d{5}\b', text)
        if phone_match and not current_profile.get("phone"):
            raw_phone = re.sub(r'[^\d+]', '', phone_match.group(0))
            if len(raw_phone) >= 7:
                extracted["phone"] = phone_match.group(0).strip()

        # 2. Name extraction (e.g., "my name is Rohan", "mera naam Priya hai", "I am Deepak")
        name_patterns = [
            r"(?:my name is|mera naam|i am|this is|naam hai)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            r"(?:call me|bol raha hoon|bol rahi hoon)\s+([A-Z][a-z]+)"
        ]
        for pat in name_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m and not current_profile.get("name"):
                name_candidate = m.group(1).strip()
                if len(name_candidate) > 2 and name_candidate.lower() not in ["help", "stressed", "calling"]:
                    extracted["name"] = name_candidate
                    break

        # 3. Location extraction (e.g. "at Sector 62", "near City Hospital", "MG Road, Pune")
        location_patterns = [
            r"(?:at|near|in|location is|living at|address is|paas)\s+([A-Za-z0-9\s,#.-]+?(?:road|street|nagar|sector|colony|block|avenue|hospital|market|station|vihar|enclave|lane))",
            r"(?:sector\s+\d+|block\s+[a-z0-9]+|flat\s+no\.?\s*\d+)",
            r"(?:near|opposite)\s+([A-Z][a-zA-Z\s]{3,20})"
        ]
        for pat in location_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m and not current_profile.get("location"):
                extracted["location"] = m.group(0).strip()
                break

        # 4. Issue categorization
        text_lower = text.lower()
        if any(w in text_lower for w in ["water", "pipe", "leak", "electricity", "power cut", "bijli", "sadak", "pothole"]):
            extracted["issue_category"] = "Public Infrastructure / Utilities"
        elif any(w in text_lower for w in ["accident", "fire", "smoke", "theft", "stolen", "ambulance"]):
            extracted["issue_category"] = "Urgent Public Safety"
        elif any(w in text_lower for w in ["appointment", "clinic", "doctor", "health camp", "fever", "cough"]):
            extracted["issue_category"] = "Non-Clinical Healthcare Support"
        elif any(w in text_lower for w in ["certificate", "ration", "pension", "id card", "portal"]):
            extracted["issue_category"] = "Civic / Public Information"

        return extracted

    def calculate_confidence(self, text: str, simulated_noise: str) -> float:
        """Calculate confidence score (0.0 to 1.0) based on text clarity and environmental noise."""
        score = 0.92  # baseline strong confidence

        if simulated_noise == "High":
            score -= 0.30
        elif simulated_noise == "Medium":
            score -= 0.15

        # Short or fragmented responses reduce confidence
        word_count = len(text.split())
        if word_count < 3:
            score -= 0.15
        elif word_count < 5:
            score -= 0.08

        # Unclear filler / unintelligible marker
        if any(w in text.lower() for w in ["...", "uh", "um", "muffled", "[inaudible]", "garbled", "static"]):
            score -= 0.20

        return max(0.20, min(0.99, round(score, 2)))

    def process_turn(self, session_id: str, caller_utterance: str, noise_level: str = "Low") -> Dict[str, Any]:
        """Process one conversational turn from caller, generating empathetic, calm response."""
        session = self.get_or_create_session(session_id)
        caller_text = caller_utterance.strip()
        
        # Multilingual & Sentiment detection
        lang_info = self.detect_multilingual_aspects(caller_text)
        session["caller_profile"]["language_detected"] = lang_info["language"]
        session["caller_profile"]["code_switched"] = lang_info["code_switched"]
        session["caller_profile"]["stress_level"] = lang_info["stress_level"]
        session["caller_profile"]["noise_level"] = noise_level

        # Calculate confidence
        confidence = self.calculate_confidence(caller_text, noise_level)
        is_low_conf = confidence < 0.65

        # Record user turn in history
        session["history"].append({
            "speaker": "caller",
            "text": caller_text,
            "confidence": confidence,
            "timestamp": datetime.datetime.now().isoformat()
        })

        # 1. First Priority: Check Strict Safety Boundaries
        safety_trigger = self.check_safety_boundaries(caller_text)
        if safety_trigger:
            session["escalated"] = True
            session["escalation_reason"] = safety_trigger["reason"]
            session["caller_profile"]["urgency"] = safety_trigger["severity"]
            ticket = self._create_ticket(session, reason=safety_trigger["reason"], priority=safety_trigger["severity"])
            session["ticket_id"] = ticket["ticket_id"]

            reply_text = safety_trigger["response_text"]
            if "Hindi" in lang_info["language"]:
                reply_text += f"\n\n{safety_trigger['response_hindi']}"

            session["history"].append({
                "speaker": "agent",
                "text": reply_text,
                "safety_alert": safety_trigger["type"],
                "timestamp": datetime.datetime.now().isoformat()
            })

            return {
                "session_id": session["session_id"],
                "reply": reply_text,
                "confidence": confidence,
                "status": "ESCALATED",
                "safety_alert": safety_trigger,
                "ticket": ticket,
                "caller_profile": session["caller_profile"],
                "confirmed_fields": session["confirmed_fields"],
                "suggested_action": "Transfer to Emergency/Human Coordinator immediately."
            }

        # 2. Check for Low Confidence / Severe Noise Resilience
        if is_low_conf:
            session["low_confidence_count"] += 1
            session["consecutive_low_conf"] += 1
            
            if session["consecutive_low_conf"] >= 2:
                # Consecutive low confidence -> Escalate to human operator with context preserved
                reason = f"Consecutive low audio confidence ({int(confidence*100)}%) due to background noise ({noise_level}). Transferred to protect caller experience."
                session["escalated"] = True
                session["escalation_reason"] = reason
                ticket = self._create_ticket(session, reason=reason, priority="Normal")
                session["ticket_id"] = ticket["ticket_id"]

                if "Hindi" in lang_info["language"]:
                    reply = (
                        "Aapke peeche se thoda shor (background noise) aa raha hai aur aapki aawaz theek se nahi aa pa rahi. "
                        "Aap chinta mat kijiye, main turant aapko hamare human executive se connect kar raha hoon jo aapki poori madad karenge."
                    )
                else:
                    reply = (
                        "I am having difficulty hearing you clearly due to the background noise. "
                        "Please don't worry—I am transferring you directly to a human support specialist right now, "
                        "and I have saved all the details you've shared so far."
                    )

                session["history"].append({
                    "speaker": "agent",
                    "text": reply,
                    "timestamp": datetime.datetime.now().isoformat()
                })
                return {
                    "session_id": session["session_id"],
                    "reply": reply,
                    "confidence": confidence,
                    "status": "ESCALATED",
                    "ticket": ticket,
                    "caller_profile": session["caller_profile"],
                    "confirmed_fields": session["confirmed_fields"],
                    "suggested_action": "Human takeover: caller is in high-noise environment."
                }
            else:
                # First low-confidence turn: politely request repetition
                if "Hindi" in lang_info["language"]:
                    reply = "Peeche shor ki wajah se thoda sa muffled tha. Kya aap kripya thoda aage aakar ya dhyan se dobara bata sakte hain?"
                else:
                    reply = "I apologize, there was some background static. Could you please repeat that last detail slowly?"

                session["history"].append({
                    "speaker": "agent",
                    "text": reply,
                    "timestamp": datetime.datetime.now().isoformat()
                })
                return {
                    "session_id": session["session_id"],
                    "reply": reply,
                    "confidence": confidence,
                    "status": "RETRY_LOW_CONFIDENCE",
                    "caller_profile": session["caller_profile"],
                    "confirmed_fields": session["confirmed_fields"]
                }
        else:
            session["consecutive_low_conf"] = 0

        # 3. Information Extraction
        new_extracted = self.extract_information(caller_text, session["caller_profile"])
        for k, v in new_extracted.items():
            session["caller_profile"][k] = v

        # 4. Check for Repetition & Confirmation Flow
        profile = session["caller_profile"]
        confirmed = session["confirmed_fields"]

        # If caller said "yes", "ha", "sahi hai", "correct" to a previous verification
        confirmation_phrases = ["yes", "yeah", "ha", "haan", "sahi hai", "correct", "that's right", "theek hai"]
        if any(phrase in caller_text.lower() for phrase in confirmation_phrases):
            if session.get("last_question") == "confirm_phone" and profile.get("phone"):
                confirmed["phone"] = True
            elif session.get("last_question") == "confirm_location" and profile.get("location"):
                confirmed["location"] = True
            elif session.get("last_question") == "confirm_name" and profile.get("name"):
                confirmed["name"] = True

        # 5. Prioritized Question Flow
        # Priority A: If caller provided a phone number and it hasn't been confirmed yet -> Read back & confirm
        if profile.get("phone") and not confirmed["phone"]:
            session["last_question"] = "confirm_phone"
            phone_formatted = " - ".join(list(re.sub(r'\D', '', profile['phone'])))
            if "Hindi" in lang_info["language"]:
                reply = (
                    f"Ji samjha. Kripya confirm karein, kya aapka phone number {profile['phone']} sahi hai? "
                    "Taki call drop hone par hum turant aapse connect kar sakein."
                )
            else:
                reply = (
                    f"Thank you. Let me confirm your phone number to ensure we can reconnect: {profile['phone']}. "
                    "Is that correct?"
                )

        # Priority B: If location is known but not confirmed
        elif profile.get("location") and not confirmed["location"]:
            session["last_question"] = "confirm_location"
            if "Hindi" in lang_info["language"]:
                reply = f"Aapka address {profile['location']} note kar liya hai. Kya yeh bilkul sahi hai?"
            else:
                reply = f"I have noted your location as {profile['location']}. Could you confirm if that is accurate?"

        # Priority C: Missing Caller Contact Number
        elif not profile.get("phone"):
            session["last_question"] = "ask_phone"
            if "Hindi" in lang_info["language"]:
                reply = (
                    "Aap bilkul pareshan mat hoiye, main aapki poori sahayata karunga. "
                    "Sabse pehle, kripya apna 10-digit mobile number batayein taki hum sampark bana sakein?"
                )
            else:
                reply = (
                    "Please rest assured, I am here to assist you step by step. "
                    "Could you first share your best contact phone number in case we get disconnected?"
                )

        # Priority D: Missing Location
        elif not profile.get("location"):
            session["last_question"] = "ask_location"
            if "Hindi" in lang_info["language"]:
                reply = "Bahut dhanyawad. Kripya apna exact ilaka, street ya landmark batayein jahan yeh samasya ho rahi hai?"
            else:
                reply = "Thank you. What is your exact address, street, or nearby landmark where this is taking place?"

        # Priority E: Caller asks for a human / escalation
        elif any(w in caller_text.lower() for w in ["human", "agent", "person", "insan", "manager", "supervisor", "transfer"]):
            reason = "Caller explicitly requested to speak with a human specialist."
            session["escalated"] = True
            session["escalation_reason"] = reason
            ticket = self._create_ticket(session, reason=reason, priority="Normal")
            session["ticket_id"] = ticket["ticket_id"]
            if "Hindi" in lang_info["language"]:
                reply = (
                    "Ji bilkul. Main aapki saari details ke sath yeh case turant hamare human officer ko transfer kar raha hoon. "
                    "Aapka Ticket ID hai " + ticket["ticket_id"] + ". Kripya 2 second line par rahein."
                )
            else:
                reply = (
                    "Certainly. I am transferring you to a human support officer right away, "
                    f"with all your verified information attached under Ticket #{ticket['ticket_id']}. Please hold on."
                )
            session["history"].append({
                "speaker": "agent",
                "text": reply,
                "timestamp": datetime.datetime.now().isoformat()
            })
            return {
                "session_id": session["session_id"],
                "reply": reply,
                "confidence": confidence,
                "status": "ESCALATED",
                "ticket": ticket,
                "caller_profile": session["caller_profile"],
                "confirmed_fields": session["confirmed_fields"],
                "suggested_action": "Human takeover as requested by caller."
            }

        # Priority F: All minimum required information collected -> Finalize or escalate with summary
        else:
            session["last_question"] = "wrap_up"
            ticket = self._create_ticket(session, reason="Minimum required details collected successfully. Handing over for dispatch.", priority="Normal")
            session["ticket_id"] = ticket["ticket_id"]
            session["state"] = "RESOLVED_PENDING_DISPATCH"
            if "Hindi" in lang_info["language"]:
                reply = (
                    f"Aapki saari essential jaankari surakshit kar li gayi hai. "
                    f"Aapka Case Reference #{ticket['ticket_id']} generate ho gaya hai aur hamari support team is par turant karyawahi karegi. "
                    "Kya main kisi aur vishay me aapki sahayata kar sakta hoon?"
                )
            else:
                reply = (
                    f"All necessary information has been recorded and verified. "
                    f"Your Case Reference #{ticket['ticket_id']} has been logged for immediate response. "
                    "Is there anything else I can assist you with right now?"
                )

        session["history"].append({
            "speaker": "agent",
            "text": reply,
            "timestamp": datetime.datetime.now().isoformat()
        })

        return {
            "session_id": session["session_id"],
            "reply": reply,
            "confidence": confidence,
            "status": session["state"],
            "ticket_id": session.get("ticket_id"),
            "caller_profile": session["caller_profile"],
            "confirmed_fields": session["confirmed_fields"]
        }

    def _create_ticket(self, session: Dict[str, Any], reason: str, priority: str = "Normal") -> Dict[str, Any]:
        """Create structured case-management ticket with complete handover summary."""
        ticket_id = f"TCK-{datetime.datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        profile = session["caller_profile"]
        
        handover_summary = {
            "ticket_id": ticket_id,
            "session_id": session["session_id"],
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "priority": priority,
            "status": "Awaiting Human Representative",
            "escalation_reason": reason,
            "caller_name": profile.get("name") or "Anonymous / Unspecified",
            "caller_phone": profile.get("phone") or "Not Provided",
            "phone_confirmed": session["confirmed_fields"].get("phone", False),
            "location": profile.get("location") or "Unspecified",
            "location_confirmed": session["confirmed_fields"].get("location", False),
            "issue_category": profile.get("issue_category", "General Assistance"),
            "language_mode": profile.get("language_detected", "English"),
            "stress_level": profile.get("stress_level", "Moderate"),
            "noise_level": profile.get("noise_level", "Low"),
            "total_turns": len(session["history"]),
            "key_summary": (
                f"Caller ({profile.get('name') or 'Caller'}, {profile.get('language_detected')}) "
                f"reported {profile.get('issue_category')}. "
                f"Contact: {profile.get('phone') or 'N/A'}. "
                f"Location: {profile.get('location') or 'N/A'}. "
                f"Reason for Transfer: {reason}."
            ),
            "transcript_snippet": session["history"][-4:] if len(session["history"]) >= 4 else session["history"]
        }
        self.tickets.insert(0, handover_summary)
        return handover_summary

    def get_tickets(self) -> List[Dict[str, Any]]:
        return self.tickets

    def resolve_ticket(self, ticket_id: str) -> bool:
        for t in self.tickets:
            if t["ticket_id"] == ticket_id:
                t["status"] = "Resolved by Human Operator"
                t["resolved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                return True
        return False

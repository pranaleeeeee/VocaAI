export interface SafetyCheckResult {
  triggered: boolean;
  type?: "MEDICAL_DIAGNOSIS" | "EMERGENCY_RESPONDER" | "LEGAL_FINANCIAL_ADVICE" | "PROHIBITED_ACTION";
  reason?: string;
  responseText?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}

export class Guardrails {
  /**
   * Evaluates text against non-negotiable public support boundaries.
   * Runs before LLM generation and before audio output delivery.
   */
  public static checkSafety(text: string): SafetyCheckResult {
    const lower = text.toLowerCase();

    // 1. Emergency Responder Replacement & Life-Safety Hazards
    const emergencyTriggers = [
      "fire in building", "building on fire", "aag lagi", "smoke in room",
      "someone is attacking", "active shooter", "intruder", "drowning",
      "severe accident", "car crash", "trapped inside", "gas leak explosion"
    ];
    for (const trigger of emergencyTriggers) {
      if (lower.includes(trigger)) {
        return {
          triggered: true,
          type: "EMERGENCY_RESPONDER",
          priority: "HIGH",
          reason: "Life-safety emergency protocol",
          responseText:
            "This sounds like an urgent emergency! If you or anyone is in immediate danger, please dial 112 (or 108 / 911) right now for local first responders. " +
            "I cannot dispatch emergency services, but I am escalating this immediately with highest priority to our human coordination desk."
        };
      }
    }

    // 2. Medical Diagnosis & Treatment Advice
    const medicalTriggers = [
      "chest pain", "heart attack", "sine me dard", "stroke", "paralysis",
      "coughing blood", "blood vomit", "should i take aspirin", "medicine dose",
      "what illness", "diagnose", "poison", "overdose", "breathing stopped",
      "unconscious", "behosh"
    ];
    for (const trigger of medicalTriggers) {
      if (lower.includes(trigger)) {
        return {
          triggered: true,
          type: "MEDICAL_DIAGNOSIS",
          priority: "HIGH",
          reason: "Medical safety boundary: non-prescriptive advisory",
          responseText:
            "I want to ensure you receive proper care, but as an automated assistant, I cannot provide medical diagnosis, clinical evaluation, or prescribe treatments. " +
            "If you are facing a medical emergency, please call 108 or 112 immediately. I am connecting you with a human representative right now."
        };
      }
    }

    // 3. Authoritative Legal & Financial Advice
    const legalFinancialTriggers = [
      "should i sue", "file lawsuit", "legal counsel", "bail bond",
      "guaranteed profit", "tax evasion", "invest all money"
    ];
    for (const trigger of legalFinancialTriggers) {
      if (lower.includes(trigger)) {
        return {
          triggered: true,
          type: "LEGAL_FINANCIAL_ADVICE",
          priority: "MEDIUM",
          reason: "Financial & legal safety boundary",
          responseText:
            "I can help with general public and customer support, but I cannot provide authoritative legal or financial advice. " +
            "I can connect you with an official representative who can point you to the appropriate resources."
        };
      }
    }

    return { triggered: false };
  }

  /**
   * Ensures AI responses do not invent completed actions or fake human joined status.
   */
  public static sanitizeAiResponse(response: string, actualState: { ticketCreated: boolean; humanJoined: boolean }): string {
    let sanitized = response;
    if (!actualState.humanJoined && /a human agent has joined/i.test(sanitized)) {
      sanitized = sanitized.replace(/a human agent has joined/gi, "I am connecting you to a human agent");
    }
    if (!actualState.ticketCreated && /your ticket has been created/i.test(sanitized)) {
      sanitized = sanitized.replace(/your ticket has been created/gi, "I will generate a ticket for you");
    }
    return sanitized;
  }
}

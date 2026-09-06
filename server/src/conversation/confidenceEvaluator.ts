import { ConversationEntities } from "../types/serverTypes.js";

export interface ConfidenceEvaluation {
  overall: number;
  breakdown: {
    sttClarity: number;
    intentClarity: number;
    consistency: number;
    confirmationRatio: number;
  };
  level: "HIGH" | "MEDIUM" | "LOW";
  requiresClarification: boolean;
  requiresEscalation: boolean;
  consecutiveLowCount: number;
}

export class ConfidenceEvaluator {
  // Documented Configurable Thresholds
  public static THRESHOLD_HIGH = 0.80;
  public static THRESHOLD_LOW = 0.65;
  public static MAX_CONSECUTIVE_LOW_BEFORE_ESCALATION = 2;

  /**
   * Deterministically evaluates conversational confidence from measurable signals.
   */
  public static evaluate(
    text: string,
    intentConfidence: number,
    entities: ConversationEntities,
    previousLowCount: number,
    isGarbledOrUnclear: boolean
  ): ConfidenceEvaluation {
    const lower = text.toLowerCase();

    // 1. STT Clarity (weight: 0.35)
    let sttClarity = 0.95;
    const isStandardShortToken = /^(yes|no|ok|okay|hi|hey|haan|nahi|theek|sahi|sure|yep|yup|why|who|bye|done)\b/i.test(lower.trim());
    if (isGarbledOrUnclear) {
      sttClarity = 0.40;
    } else if (lower.includes("...") || (lower.length < 5 && !isStandardShortToken)) {
      sttClarity = 0.60;
    }

    // 2. Intent Clarity (weight: 0.25)
    const intentClarity = Math.max(0.3, Math.min(1.0, intentConfidence));

    // 3. Consistency (weight: 0.20)
    let consistency = 0.90;
    if (lower.includes("wait") && lower.includes("...")) {
      consistency = 0.50;
    }

    // 4. Confirmation Ratio (weight: 0.20)
    const entityList = Object.values(entities).filter(Boolean);
    let confirmationRatio = 0.80;
    if (entityList.length > 0) {
      const confirmedCount = entityList.filter((e) => e.confirmed).length;
      confirmationRatio = 0.5 + 0.5 * (confirmedCount / entityList.length);
    }

    // Weighted Overall Calculation
    const overall =
      sttClarity * 0.35 +
      intentClarity * 0.25 +
      consistency * 0.20 +
      confirmationRatio * 0.20;

    const roundedOverall = Math.round(overall * 100) / 100;

    let level: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
    if (roundedOverall >= this.THRESHOLD_HIGH) {
      level = "HIGH";
    } else if (roundedOverall >= this.THRESHOLD_LOW) {
      level = "MEDIUM";
    } else {
      level = "LOW";
    }

    const isLow = roundedOverall < this.THRESHOLD_LOW || isGarbledOrUnclear;
    const consecutiveLowCount = isLow ? previousLowCount + 1 : 0;
    const requiresClarification = isLow && consecutiveLowCount < this.MAX_CONSECUTIVE_LOW_BEFORE_ESCALATION;
    const requiresEscalation = consecutiveLowCount >= this.MAX_CONSECUTIVE_LOW_BEFORE_ESCALATION;

    return {
      overall: roundedOverall,
      breakdown: {
        sttClarity,
        intentClarity,
        consistency,
        confirmationRatio
      },
      level,
      requiresClarification,
      requiresEscalation,
      consecutiveLowCount
    };
  }
}

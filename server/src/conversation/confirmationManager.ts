import { ConversationEntities } from "../types/serverTypes.js";

export class ConfirmationManager {
  private static affirmativeKeywords = [
    "yes", "yeah", "yep", "yup", "sure", "correct", "right", "exactly", "that's right",
    "ok", "okay", "haan", "ha", "haanji", "hanji", "sahi", "sahi hai", "theek hai",
    "theek", "bilkul", "bilkul sahi", "confirm", "confirmed", "true"
  ];

  private static negativeKeywords = [
    "no", "nope", "not", "wrong", "nahi", "galat", "incorrect", "sorry"
  ];

  public static isAffirmative(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return this.affirmativeKeywords.some((kw) => {
      const regex = new RegExp(`(^|\\b|\\s)${kw}(\\b|\\s|$)`, "i");
      return regex.test(lower);
    });
  }

  public static isNegative(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return this.negativeKeywords.some((kw) => {
      const regex = new RegExp(`(^|\\b|\\s)${kw}(\\b|\\s|$)`, "i");
      return regex.test(lower);
    });
  }

  /**
   * Applies user correction: replaces old value, marks confirmed = false.
   */
  public static applyCorrection(
    entities: ConversationEntities,
    field: keyof ConversationEntities,
    newValue: string
  ): void {
    entities[field] = {
      value: newValue,
      confirmed: false,
      confidence: 0.95,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Marks a pending field as confirmed.
   */
  public static confirmField(entities: ConversationEntities, field: keyof ConversationEntities): void {
    if (entities[field]) {
      entities[field]!.confirmed = true;
    }
  }
}

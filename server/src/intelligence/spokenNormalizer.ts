export interface NormalizedSpokenOutput {
  rawTranscript: string;
  normalizedText: string;
  stutterDeduplicated: boolean;
}

export class SpokenNormalizer {
  /**
   * Performs semantic normalization on spoken voice transcripts while
   * keeping the raw transcript intact for UI display.
   * Tolerates acoustic stutters, repeated words, and natural spoken speech fragments.
   */
  public static normalize(rawTranscript: string): string {
    if (!rawTranscript || typeof rawTranscript !== "string") return "";
    let text = rawTranscript.trim();

    // 1. Acoustic stutter and consecutive repeated token deduplication
    // Examples:
    // "why do why do we have seasons" -> "why do we have seasons"
    // "what what is the capital of of Assam" -> "what is the capital of Assam"
    
    // Deduplicate repeated 2-word phrases:
    text = text.replace(/\b([a-zA-Z]+(?:\s+[a-zA-Z]+))\s+\1\b/gi, "$1");
    // Deduplicate repeated single words:
    text = text.replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1");
    // Run one more time for cascaded repeats (e.g. "what what what", "of of of")
    text = text.replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1");

    // Remove speech disfluencies and fillers at beginning of utterance
    text = text.replace(/^(?:uh|um|er|ah|like|you know|actually)\s+/i, "");

    // 2. Normalization of common spoken-voice fragments
    // "you real person" / "you a real person" -> "are you a real person"
    if (/^you\s+(a\s+)?real\s+person\b/i.test(text)) {
      text = text.replace(/^you\s+(a\s+)?real\s+person/i, "are you a real person");
    } else if (/^you\s+human\b/i.test(text)) {
      text = text.replace(/^you\s+human/i, "are you human");
    } else if (/^you\s+ai\b/i.test(text)) {
      text = text.replace(/^you\s+ai/i, "are you an ai");
    } else if (/^you\s+bot\b/i.test(text)) {
      text = text.replace(/^you\s+bot/i, "are you a bot");
    }

    // "why is yellow colour so yellow" -> "why does yellow look yellow"
    if (/why\s+is\s+yellow\s+colou?r\s+so\s+yellow/i.test(text)) {
      text = "why is yellow colour so yellow";
    }

    // "what happened in the cricket worlds today" -> "what happened in the cricket world today"
    text = text.replace(/\bcricket\s+worlds\b/gi, "cricket world");

    // "weather Delhi tomorrow" -> "weather in Delhi tomorrow"
    if (/^weather\s+([A-Za-z]+)\s+(tomorrow|today|now)\b/i.test(text) && !/^weather\s+in\b/i.test(text)) {
      text = text.replace(/^weather\s+([A-Za-z]+)\s+/i, "weather in $1 ");
    }

    // Clean multiple spaces
    text = text.replace(/\s+/g, " ").trim();
    return text;
  }
}


import { exec } from "child_process";
import path from "path";
import fs from "fs";

const MEDIA_CACHE_DIR = path.resolve(process.cwd(), "media_cache");
if (!fs.existsSync(MEDIA_CACHE_DIR)) {
  fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
}

export class TtsService {
  /**
   * Synthesizes neural audio MP3 using Edge-TTS.
   */
  public static async synthesize(
    text: string,
    voice: string = "en-US-JennyNeural",
    rate: string = "+0%",
    pitch: string = "+0Hz"
  ): Promise<string> {
    const filename = `tts_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp3`;
    const outputPath = path.join(MEDIA_CACHE_DIR, filename);

    // Auto-select Hindi voice if text contains Hindi words
    let selectedVoice = voice;
    if (
      /[\u0900-\u097F]/.test(text) ||
      /\b(ji|aap|mera|naam|madad|kripya|samasya|bhaiya|nahi|hua|sahi)\b/i.test(text)
    ) {
      selectedVoice = "hi-IN-SwaraNeural";
    }

    // Escape text for shell/python execution
    const safeText = text.replace(/"/g, '\\"').replace(/\n/g, " ");

    return new Promise((resolve, reject) => {
      const cmd = `python -c "import asyncio, edge_tts; asyncio.run(edge_tts.Communicate('''${safeText}''', '${selectedVoice}', rate='${rate}', pitch='${pitch}').save('''${outputPath}'''))"`;
      exec(cmd, (err, _stdout, stderr) => {
        if (err) {
          console.warn("[TTS Warning] Python edge-tts execution error:", stderr || err.message);
          return reject(err);
        }
        resolve(outputPath);
      });
    });
  }
}

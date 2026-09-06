import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { TtsService } from "./ttsService.js";

// In Vercel serverless, /var/task is read-only; only /tmp is writable.
// Locally, use the cwd-relative paths (unchanged behaviour).
const IS_SERVERLESS = !!process.env.VERCEL;
const UPLOADS_DIR = IS_SERVERLESS ? "/tmp/uploads" : path.resolve(process.cwd(), "uploads");
const OUTPUT_DIR  = IS_SERVERLESS ? "/tmp/output"  : path.resolve(process.cwd(), "output");

// Lazy directory creation — called only when a job actually starts,
// never at import time, so module load never crashes in serverless.
function ensureJobDirs(): void {
  [UPLOADS_DIR, OUTPUT_DIR].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}


export type VideoJobStatus = "Uploading" | "Processing" | "Generating Voice" | "Merging Audio" | "Completed" | "Failed";

export interface VideoJob {
  jobId: string;
  status: VideoJobStatus;
  progress: number;
  inputVideoPath: string;
  outputVideoPath?: string;
  error?: string;
  createdAt: string;
}

export class VideoService {
  private static jobs: Map<string, VideoJob> = new Map();

  public static getJob(jobId: string): VideoJob | undefined {
    return this.jobs.get(jobId);
  }

  public static async processVoiceover(
    jobId: string,
    videoFile: Express.Multer.File,
    scriptText: string,
    voice: string = "en-US-JennyNeural",
    rate: string = "+0%",
    pitch: string = "+0Hz",
    keepOriginalAudio: boolean = false
  ): Promise<VideoJob> {
    // Ensure writable directories exist before any file I/O (lazy + safe).
    ensureJobDirs();

    const inputExt = path.extname(videoFile.originalname) || ".mp4";
    const inputVideoPath = path.join(UPLOADS_DIR, `in_${jobId}${inputExt}`);
    const outputVideoPath = path.join(OUTPUT_DIR, `dubbed_${jobId}.mp4`);

    fs.writeFileSync(inputVideoPath, videoFile.buffer);

    const job: VideoJob = {
      jobId,
      status: "Processing",
      progress: 15,
      inputVideoPath,
      createdAt: new Date().toISOString()
    };
    this.jobs.set(jobId, job);

    // Asynchronous processing pipeline
    (async () => {
      try {
        job.status = "Generating Voice";
        job.progress = 40;
        const audioPath = await TtsService.synthesize(scriptText, voice, rate, pitch);

        job.status = "Merging Audio";
        job.progress = 70;

        const cmd = keepOriginalAudio
          ? `python -c "import subprocess, static_ffmpeg; static_ffmpeg.add_paths(); subprocess.run(['ffmpeg', '-y', '-i', '''${inputVideoPath}''', '-i', '''${audioPath}''', '-filter_complex', '[0:a]volume=0.2[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first[aout]', '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-shortest', '''${outputVideoPath}'''])"`
          : `python -c "import subprocess, static_ffmpeg; static_ffmpeg.add_paths(); subprocess.run(['ffmpeg', '-y', '-i', '''${inputVideoPath}''', '-i', '''${audioPath}''', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', '''${outputVideoPath}'''])"`;

        await new Promise<void>((resolve, reject) => {
          exec(cmd, (err, _stdout, stderr) => {
            if (err) {
              console.warn("[FFmpeg Error]", stderr);
              return reject(err);
            }
            resolve();
          });
        });

        job.status = "Completed";
        job.progress = 100;
        job.outputVideoPath = outputVideoPath;
      } catch (err: any) {
        job.status = "Failed";
        job.error = err.message || "Video dubbing failed";
      }
    })();

    return job;
  }
}

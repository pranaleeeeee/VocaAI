import { Router } from "express";
import multer from "multer";
import { VideoService } from "../services/videoService.js";

const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max

export const videoRoutes = Router();

videoRoutes.post("/voiceover", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing video file in request" });
    }
    const { script, voice, rate, pitch, keepOriginalAudio } = req.body;
    if (!script) {
      return res.status(400).json({ error: "Missing script text" });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const job = await VideoService.processVoiceover(
      jobId,
      req.file,
      script,
      voice,
      rate,
      pitch,
      keepOriginalAudio === "true" || keepOriginalAudio === true
    );

    res.json({ success: true, job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

videoRoutes.get("/status/:jobId", (req, res) => {
  const job = VideoService.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json({ job });
});

videoRoutes.get("/download/:jobId", (req, res) => {
  const job = VideoService.getJob(req.params.jobId);
  if (!job || !job.outputVideoPath) {
    return res.status(404).json({ error: "Dubbed video not ready or job not found" });
  }
  res.download(job.outputVideoPath, `vocaai_dubbed_${req.params.jobId}.mp4`);
});

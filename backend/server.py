"""
VocaAI Studio - Flask Backend Server
Hosts:
- Real-Time Multilingual Voice AI Agent Dialog API & Guardrails
- Neural Edge-TTS Speech Synthesis API (Hindi, English, Spanish, etc.)
- FFmpeg Video Voiceover Dubbing Pipeline (static-ffmpeg)
- Case Management & Escalation Ticketing API
- Frontend Static Assets
"""

import os
import sys
import json
import uuid
import asyncio
import subprocess
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

# Ensure static-ffmpeg is initialized into PATH
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
    print("[FFmpeg] static_ffmpeg initialized successfully.")
except Exception as e:
    print(f"[FFmpeg] Warning: static_ffmpeg failed to initialize: {e}")

import edge_tts
from agent_engine import AgentEngine

# Base directory setup
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
MEDIA_CACHE_DIR = BASE_DIR / "media_cache"
MEDIA_CACHE_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
CORS(app)

agent_engine = AgentEngine()

# Predefined high quality neural voices
SUPPORTED_VOICES = [
    {"id": "hi-IN-SwaraNeural", "name": "Swara (Hindi - India, Female)", "lang": "hi-IN", "gender": "Female"},
    {"id": "hi-IN-MadhurNeural", "name": "Madhur (Hindi - India, Male)", "lang": "hi-IN", "gender": "Male"},
    {"id": "en-IN-NeerjaNeural", "name": "Neerja (English - India, Female)", "lang": "en-IN", "gender": "Female"},
    {"id": "en-IN-PrabhatNeural", "name": "Prabhat (English - India, Male)", "lang": "en-IN", "gender": "Male"},
    {"id": "en-US-JennyNeural", "name": "Jenny (English - US, Natural Female)", "lang": "en-US", "gender": "Female"},
    {"id": "en-US-GuyNeural", "name": "Guy (English - US, Natural Male)", "lang": "en-US", "gender": "Male"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia (English - UK, Female)", "lang": "en-GB", "gender": "Female"},
    {"id": "es-ES-ElviraNeural", "name": "Elvira (Spanish - Spain, Female)", "lang": "es-ES", "gender": "Female"},
    {"id": "fr-FR-DeniseNeural", "name": "Denise (French - France, Female)", "lang": "fr-FR", "gender": "Female"}
]

@app.route("/")
def index():
    return send_from_directory(str(FRONTEND_DIR), "index.html")

@app.route("/<path:path>")
def static_files(path):
    file_path = FRONTEND_DIR / path
    if file_path.exists():
        return send_from_directory(str(FRONTEND_DIR), path)
    return send_from_directory(str(FRONTEND_DIR), "index.html")

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "VocaAI Studio Backend",
        "features": {
            "realtime_voice_agent": True,
            "multilingual_codeswitching": True,
            "edge_tts": True,
            "ffmpeg_muxing": True,
            "safety_guardrails": True,
            "case_ticketing": True
        }
    })

@app.route("/api/voices", methods=["GET"])
def get_voices():
    return jsonify({"voices": SUPPORTED_VOICES})

async def _synthesize_edge_tts(text: str, voice: str, rate: str, pitch: str, output_path: str):
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)

@app.route("/api/tts", methods=["POST"])
def generate_tts():
    """Synthesizes high-definition speech using Edge-TTS."""
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    voice = data.get("voice", "hi-IN-SwaraNeural")
    rate = data.get("rate", "+0%")
    pitch = data.get("pitch", "+0Hz")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Auto-select voice if Hinglish or Hindi detected and voice wasn't explicitly changed
    if any(hindi_word in text.lower() for hindi_word in ["ji", "aap", "mera", "naam", "madad", "kripya", "samasya", "bhaiya"]):
        if not voice.startswith("hi-"):
            voice = "hi-IN-SwaraNeural"

    filename = f"tts_{uuid.uuid4().hex[:12]}.mp3"
    filepath = MEDIA_CACHE_DIR / filename

    try:
        asyncio.run(_synthesize_edge_tts(text, voice, rate, pitch, str(filepath)))
        return send_file(str(filepath), mimetype="audio/mpeg", as_attachment=False)
    except Exception as e:
        print(f"[TTS Error] {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/agent/chat", methods=["POST"])
def agent_chat():
    """Processes conversational turn with code-switching, safety guardrails, and telemetry."""
    data = request.get_json() or {}
    session_id = data.get("session_id")
    utterance = data.get("utterance", "").strip()
    noise_level = data.get("noise_level", "Low")  # Low, Medium, High

    if not utterance:
        return jsonify({"error": "Empty utterance"}), 400

    result = agent_engine.process_turn(session_id, utterance, noise_level)
    return jsonify(result)

@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    """Returns all escalated cases for the supervisor case-management dashboard."""
    return jsonify({"tickets": agent_engine.get_tickets()})

@app.route("/api/tickets/resolve", methods=["POST"])
def resolve_ticket():
    data = request.get_json() or {}
    ticket_id = data.get("ticket_id")
    if not ticket_id:
        return jsonify({"error": "Missing ticket_id"}), 400
    
    success = agent_engine.resolve_ticket(ticket_id)
    return jsonify({"success": success, "ticket_id": ticket_id})

@app.route("/api/video/dub", methods=["POST"])
def video_dub():
    """
    Combines user uploaded video with generated AI voiceover script using FFmpeg.
    """
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video_file = request.files["video"]
    script_text = request.form.get("script", "").strip()
    voice = request.form.get("voice", "en-US-JennyNeural")
    rate = request.form.get("rate", "+0%")
    pitch = request.form.get("pitch", "+0Hz")
    keep_original_audio = request.form.get("keep_original_audio", "false").lower() == "true"

    if not script_text:
        return jsonify({"error": "No voiceover script provided"}), 400

    job_id = uuid.uuid4().hex[:10]
    in_video_path = MEDIA_CACHE_DIR / f"in_{job_id}_{video_file.filename}"
    out_audio_path = MEDIA_CACHE_DIR / f"voice_{job_id}.mp3"
    out_video_path = MEDIA_CACHE_DIR / f"dubbed_{job_id}.mp4"

    video_file.save(str(in_video_path))

    try:
        # Step 1: Synthesize AI Voiceover via Edge-TTS
        asyncio.run(_synthesize_edge_tts(script_text, voice, rate, pitch, str(out_audio_path)))

        # Step 2: Combine Audio and Video with FFmpeg
        if keep_original_audio:
            # Mix original video audio (ducked to 20%) with new AI voiceover at 100%
            cmd = [
                "ffmpeg", "-y",
                "-i", str(in_video_path),
                "-i", str(out_audio_path),
                "-filter_complex", "[0:a]volume=0.2[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first[aout]",
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                str(out_video_path)
            ]
        else:
            # Replace original audio completely with new AI voiceover
            cmd = [
                "ffmpeg", "-y",
                "-i", str(in_video_path),
                "-i", str(out_audio_path),
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                str(out_video_path)
            ]

        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            print(f"[FFmpeg Error] {proc.stderr}")
            # Fallback: re-encode video in case stream copy fails
            fallback_cmd = [
                "ffmpeg", "-y",
                "-i", str(in_video_path),
                "-i", str(out_audio_path),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                str(out_video_path)
            ]
            fallback_proc = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if fallback_proc.returncode != 0:
                return jsonify({"error": f"FFmpeg processing failed: {fallback_proc.stderr[:300]}"}), 500

        return send_file(
            str(out_video_path),
            mimetype="video/mp4",
            as_attachment=True,
            download_name=f"vocaai_dubbed_{job_id}.mp4"
        )
    except Exception as e:
        print(f"[Dubbing Exception] {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"=======================================================")
    print(f"  VocaAI Studio Backend Server Starting on Port {port} ")
    print(f"  Live URL: http://127.0.0.1:{port}                    ")
    print(f"=======================================================")
    app.run(host="0.0.0.0", port=port, debug=False)

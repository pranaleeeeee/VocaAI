import React, { useEffect, useRef } from "react";

interface WaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  statusText?: string;
  height?: number;
  width?: number;
}

export const WaveformVisualizer: React.FC<WaveformProps> = ({
  isSpeaking,
  isListening,
  statusText,
  height = 90,
  width = 540
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      // Adjust wave parameters based on state
      let speed = 0.025;
      let primaryAmp = 8;
      let lineCount = 3;

      if (isSpeaking) {
        speed = 0.055;
        primaryAmp = 24;
      } else if (isListening) {
        speed = 0.04;
        primaryAmp = 18;
      }

      phase += speed;

      // Draw flowing multi-layer Siri waves
      const waves = [
        { color: "rgba(99, 102, 241, 0.45)", freq: 0.012, ampMod: 1.0, phaseOffset: 0, lineWidth: 1.8 },
        { color: "rgba(139, 92, 246, 0.35)", freq: 0.018, ampMod: 0.75, phaseOffset: 1.8, lineWidth: 1.5 },
        { color: "rgba(56, 189, 248, 0.35)", freq: 0.015, ampMod: 0.6, phaseOffset: 3.2, lineWidth: 1.2 }
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = "round";

        for (let x = 0; x < w; x += 2) {
          // Attenuate amplitude at edges (Gaussian / window envelope)
          const normX = (x / w) * 2 - 1; // -1 to 1
          const envelope = Math.max(0, 1 - normX * normX);

          const y =
            centerY +
            Math.sin(x * wave.freq + phase + wave.phaseOffset) *
              (primaryAmp * wave.ampMod) *
              envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isSpeaking, isListening]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: `${width}px`,
      height: `${height}px`,
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none"
    }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%", opacity: isSpeaking || isListening ? 1 : 0.6, transition: "opacity 0.3s" }}
      />
      {statusText && (
        <div style={{
          position: "absolute",
          bottom: 4,
          fontSize: "12px",
          color: "var(--text-muted)",
          letterSpacing: "0.2px",
          fontWeight: 400
        }}>
          {statusText}
        </div>
      )}
    </div>
  );
};

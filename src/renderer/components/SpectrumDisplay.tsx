import { useRef, useEffect } from "react";

interface Props {
  data: Uint8Array | null;
  height?: number;
  color?: string;
}

export default function SpectrumDisplay({ data, height = 80, color = "#a78bfa" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, w, h);

    const barCount = Math.min(data.length, 128); // Show first 128 bins
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const barHeight = (data[i] / 255) * h;
      const x = i * barWidth;
      const y = h - barHeight;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7 + (data[i] / 255) * 0.3;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
    ctx.globalAlpha = 1;
  }, [data, color, height]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      className="w-full rounded bg-gray-800"
      style={{ height: `${height}px` }}
    />
  );
}

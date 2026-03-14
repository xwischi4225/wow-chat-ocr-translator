import type { Region } from "@/types";
import { type RefObject, useCallback, useEffect, useRef } from "react";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  region: Region | null;
  onRegionChange: (region: Region) => void;
}

function getVideoRect(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
) {
  if (videoW === 0 || videoH === 0) {
    return { ox: 0, oy: 0, rw: containerW, rh: containerH };
  }
  const scale = Math.min(containerW / videoW, containerH / videoH);
  const rw = videoW * scale;
  const rh = videoH * scale;
  const ox = (containerW - rw) / 2;
  const oy = (containerH - rh) / 2;
  return { ox, oy, rw, rh };
}

export function RegionCanvas({ videoRef, region, onRegionChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const startFrac = useRef({ x: 0, y: 0 });
  const currentDrag = useRef<Region | null>(null);
  const animFrameRef = useRef<number>(0);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas buffer to display size
    if (
      canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight
    ) {
      canvas.width = canvas.clientWidth || 640;
      canvas.height = canvas.clientHeight || 360;
    }

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    const r = currentDrag.current || region;

    if (r && r.w > 0 && r.h > 0) {
      // Dark overlay on non-selected areas
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, cw, ch);

      // Get video dimensions to compute letterbox offset
      const video = videoRef.current;
      const vw = video?.videoWidth ?? 0;
      const vh = video?.videoHeight ?? 0;
      const { ox, oy, rw: vrw, rh: vrh } = getVideoRect(cw, ch, vw, vh);

      const rx = ox + r.x * vrw;
      const ry = oy + r.y * vrh;
      const rWidth = r.w * vrw;
      const rHeight = r.h * vrh;

      // Clear selected region
      ctx.clearRect(rx, ry, rWidth, rHeight);

      // Gold dashed border
      ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(rx, ry, rWidth, rHeight);
      ctx.setLineDash([]);

      // Corner markers
      const cornerSize = 10;
      ctx.strokeStyle = "rgba(255, 215, 0, 1)";
      ctx.lineWidth = 3;
      const corners = [
        [rx, ry, 1, 1],
        [rx + rWidth, ry, -1, 1],
        [rx, ry + rHeight, 1, -1],
        [rx + rWidth, ry + rHeight, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cornerSize, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * cornerSize);
        ctx.stroke();
      }

      // Dimension label
      if (video && video.videoWidth > 0) {
        const pw = Math.round(r.w * vw);
        const ph = Math.round(r.h * vh);
        const label = `${pw}×${ph}px`;
        ctx.font = "bold 11px JetBrains Mono, monospace";
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(rx, ry - 22, textW + 10, 18);
        ctx.fillStyle = "rgba(255, 215, 0, 0.95)";
        ctx.fillText(label, rx + 5, ry - 8);
      }
    } else {
      // Crosshair hint when no region
      ctx.strokeStyle = "rgba(255,215,0,0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(cw / 2, 0);
      ctx.lineTo(cw / 2, ch);
      ctx.moveTo(0, ch / 2);
      ctx.lineTo(cw, ch / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [region, videoRef]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth || 640;
      canvas.height = canvas.clientHeight || 360;
      drawOverlay();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawOverlay]);

  const getFrac = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;

    const video = videoRef.current;
    const vw = video?.videoWidth ?? 0;
    const vh = video?.videoHeight ?? 0;
    const { ox, oy, rw, rh } = getVideoRect(rect.width, rect.height, vw, vh);

    return {
      x: Math.max(0, Math.min(1, (ex - ox) / rw)),
      y: Math.max(0, Math.min(1, (ey - oy) / rh)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    const pos = getFrac(e);
    startFrac.current = pos;
    currentDrag.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const pos = getFrac(e);
    const sx = startFrac.current.x;
    const sy = startFrac.current.y;
    currentDrag.current = {
      x: Math.min(sx, pos.x),
      y: Math.min(sy, pos.y),
      w: Math.abs(pos.x - sx),
      h: Math.abs(pos.y - sy),
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(drawOverlay);
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const drag = currentDrag.current;
    if (drag && drag.w > 0.02 && drag.h > 0.02) {
      onRegionChange(drag);
    }
    currentDrag.current = null;
    drawOverlay();
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-ocid="capture.canvas_target"
    />
  );
}

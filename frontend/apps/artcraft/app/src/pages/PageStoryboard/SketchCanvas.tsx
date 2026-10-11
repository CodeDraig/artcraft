import { useState, useRef, useEffect } from "react";
import {
  CheckIcon,
  EraserIcon,
  PencilIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import { DynamicIcon } from "@storyteller/icons";
import { twMerge } from "tailwind-merge";

const CANVAS_W = 1280;

const CANVAS_H = 720;

const MAX_UNDO = 20;

// ─── SketchCanvas ─────────────────────────────────────────────────────────────

type SketchTool = "pencil" | "eraser";

interface SketchCanvasProps {
  initialImageDataUrl: string | null;
  onSave: (dataUrl: string) => void;
  onExit: () => void;
}

export const SketchCanvas = ({
  initialImageDataUrl,
  onSave,
  onExit,
}: SketchCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<SketchTool>("pencil");
  const [color, setColor] = useState("#1a1a1a");
  const [brushSize, setBrushSize] = useState(4);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);

  // Initialize canvas once on mount: fill white, draw reference image if present
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (initialImageDataUrl) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
        const x = (CANVAS_W - img.width * scale) / 2;
        const y = (CANVAS_H - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      };
      img.src = initialImageDataUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once — we own the canvas state after mount

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const applyCtxSettings = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 1;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
    }
  };

  const snapshotForUndo = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    setUndoStack((prev) => [...prev.slice(-(MAX_UNDO - 1)), snap]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    snapshotForUndo();
    isDrawingRef.current = true;
    const pos = getCoords(e);
    prevPosRef.current = pos;

    // Draw a dot at click point
    applyCtxSettings(ctx);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !prevPosRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const pos = getCoords(e);
    const mid = {
      x: (prevPosRef.current.x + pos.x) / 2,
      y: (prevPosRef.current.y + pos.y) / 2,
    };

    applyCtxSettings(ctx);
    ctx.beginPath();
    ctx.moveTo(prevPosRef.current.x, prevPosRef.current.y);
    ctx.quadraticCurveTo(
      prevPosRef.current.x,
      prevPosRef.current.y,
      mid.x,
      mid.y,
    );
    ctx.stroke();

    prevPosRef.current = pos;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    prevPosRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onSave(dataUrl);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const snap = undoStack[undoStack.length - 1];
    ctx.putImageData(snap, 0, 0);
    setUndoStack((prev) => prev.slice(0, -1));
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onSave(dataUrl);
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    snapshotForUndo();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onSave(dataUrl);
  };

  const toolBtn = (t: SketchTool, icon: typeof PencilIcon, label: string) => (
    <button
      onClick={() => setTool(t)}
      title={label}
      className={twMerge(
        "flex h-8 w-8 items-center justify-center rounded-[3px] transition-colors",
        tool === t
          ? "bg-white text-black"
          : "text-base-fg/60 hover:bg-white/10 hover:text-base-fg",
      )}
    >
      <DynamicIcon icon={icon} className="text-sm" />
    </button>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-ui-panel-border bg-ui-panel px-3 py-1.5">
        {toolBtn("pencil", PencilIcon, "Pencil")}
        {toolBtn("eraser", EraserIcon, "Eraser")}

        <div className="mx-1 h-5 w-px bg-ui-panel-border" />

        {/* Color picker */}
        <label
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] border border-white/15 hover:border-white/30"
          title="Stroke color"
        >
          <span
            className="h-4 w-4 rounded-sm border border-white/20"
            style={{ background: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        {/* Brush size */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-base-fg/40">
            Size
          </span>
          <input
            type="range"
            min={1}
            max={32}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 accent-white"
          />
          <span className="w-5 text-center font-mono text-[10px] tabular-nums text-base-fg/50">
            {brushSize}
          </span>
        </div>

        <div className="mx-1 h-5 w-px bg-ui-panel-border" />

        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="Undo"
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-base-fg/60 transition-colors hover:bg-white/10 hover:text-base-fg disabled:opacity-30"
        >
          <RotateCcwIcon className="text-sm" />
        </button>

        <button
          onClick={handleClear}
          title="Clear canvas"
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-base-fg/60 transition-colors hover:bg-white/10 hover:text-red-400"
        >
          <XIcon className="text-sm" />
        </button>

        <button
          onClick={onExit}
          title="Done sketching"
          className="ml-auto flex h-8 items-center gap-1.5 rounded-[3px] bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-white/85"
        >
          <CheckIcon className="text-xs" />
          Done
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#2a2a2a] p-3">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            cursor: tool === "eraser" ? "cell" : "crosshair",
            touchAction: "none",
            display: "block",
          }}
          className="border border-white/15"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  );
};

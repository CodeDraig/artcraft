import React, { useState, useEffect, useCallback, memo } from "react";
import Konva from "konva";
import { type Model3DOverlayHandle } from "./components/Model3DOverlay";
import { CameraIcon, Maximize2Icon, RefreshCwIcon } from "lucide-react";

// ─── DragScrubButton ──────────────────────────────────────────────────────────
function DragScrubButton({
  icon,
  title,
  onDrag,
}: {
  icon: React.ReactNode;
  title: string;
  onDrag: (dx: number, dy: number) => void;
}) {
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons === 0) return;
    onDrag(e.movementX, e.movementY);
  };
  return (
    <button
      title={title}
      className="flex h-10 w-10 cursor-move items-center justify-center rounded-full bg-black/70 text-white shadow-lg hover:bg-black/90 active:bg-primary"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      {icon}
    </button>
  );
}

// ─── Edit3DScrubControls ──────────────────────────────────────────────────────
interface Edit3DScrubControlsProps {
  nodeId: string;
  stageRef: { current: Konva.Stage };
  overlayHandle: React.RefObject<Model3DOverlayHandle | null>;
}

export const Edit3DScrubControls = memo(function Edit3DScrubControls({
  nodeId,
  stageRef,
  overlayHandle,
}: Edit3DScrubControlsProps) {
  const [, forceUpdate] = useState(0);
  const bump = useCallback(() => forceUpdate((t) => t + 1), []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.on) return;
    const ns = ".edit3dcontrols";
    stage.on(
      `dragmove${ns} xChange${ns} yChange${ns} scaleXChange${ns} scaleYChange${ns}`,
      bump,
    );
    return () => {
      stage.off(ns);
    };
  }, [stageRef, bump, nodeId]);

  const stage = stageRef.current;
  if (!stage?.container) return null;
  const konvaNode = stage.findOne("#" + nodeId) as Konva.Shape | undefined;
  if (!konvaNode) return null;

  const clientRect = konvaNode.getClientRect();
  const stageContainerRect = stage.container().getBoundingClientRect();
  const cx = stageContainerRect.left + clientRect.x + clientRect.width / 2;
  const cy = stageContainerRect.top + clientRect.y + clientRect.height / 2;

  return (
    <div
      className="pointer-events-auto fixed z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
      style={{ left: cx, top: cy }}
    >
      <DragScrubButton
        icon={<Maximize2Icon />}
        title="Scale — drag"
        onDrag={(dx, dy) => overlayHandle.current?.onScaleDrag(dx, dy)}
      />
      <DragScrubButton
        icon={<RefreshCwIcon />}
        title="Rotate — drag"
        onDrag={(dx, dy) => overlayHandle.current?.onRotateDrag(dx, dy)}
      />
      <DragScrubButton
        icon={<CameraIcon />}
        title="Field of view — drag"
        onDrag={(dx, dy) => overlayHandle.current?.onFovDrag(dx, dy)}
      />
      <button
        onClick={() => overlayHandle.current?.commit()}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-lg hover:bg-primary-400"
        onPointerDown={(e) => e.stopPropagation()}
      >
        ✓
      </button>
    </div>
  );
});

import { useState, useEffect, useCallback, memo } from "react";
import Konva from "konva";

// ─── Edit3DButton ─────────────────────────────────────────────────────────────
interface Edit3DButtonProps {
  nodeId: string;
  stageRef: { current: Konva.Stage };
  onEdit: (nodeId: string) => void;
}

export const Edit3DButton = memo(function Edit3DButton({
  nodeId,
  stageRef,
  onEdit,
}: Edit3DButtonProps) {
  const [, forceUpdate] = useState(0);
  const bump = useCallback(() => forceUpdate((t) => t + 1), []);
  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage?.on) return;

    const ns = ".edit3dbtn";
    stage.on(
      `dragmove${ns} xChange${ns} yChange${ns} scaleXChange${ns} scaleYChange${ns}`,
      bump,
    );

    const transformers = stage.find("Transformer");
    transformers.forEach((tr) => {
      tr.on(`transformstart${ns}`, () => setInteracting(true));
      tr.on(`transformend${ns}`, () =>
        requestAnimationFrame(() => {
          setInteracting(false);
          bump();
        }),
      );
    });

    const konvaNode = stage.findOne("#" + nodeId);
    if (konvaNode) {
      konvaNode.on(`dragstart${ns}`, () => setInteracting(true));
      konvaNode.on(`dragend${ns}`, () =>
        requestAnimationFrame(() => {
          setInteracting(false);
          bump();
        }),
      );
    }

    return () => {
      stage.off(ns);
      transformers.forEach((tr) => tr.off(ns));
      konvaNode?.off(ns);
    };
  }, [stageRef, bump, nodeId]);

  if (interacting) return null;

  const stage = stageRef.current;
  if (!stage?.container) return null;

  const konvaNode = stage.findOne("#" + nodeId) as Konva.Shape | undefined;
  if (!konvaNode) return null;

  const clientRect = konvaNode.getClientRect();
  const stageContainerRect = stage.container().getBoundingClientRect();
  const btnLeft = stageContainerRect.left + clientRect.x + clientRect.width / 2;
  const btnTop = stageContainerRect.top + clientRect.y + clientRect.height / 2;

  return (
    <button
      className="pointer-events-auto fixed z-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-lg hover:bg-primary-400"
      style={{ left: btnLeft, top: btnTop }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onEdit(nodeId)}
    >
      Edit 3D
    </button>
  );
});

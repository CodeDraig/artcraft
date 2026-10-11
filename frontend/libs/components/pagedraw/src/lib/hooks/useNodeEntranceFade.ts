import { useLayoutEffect, useRef, type RefObject } from "react";
import Konva from "konva";
import type { Node } from "../Node";
import type { LineNode } from "../stores/SceneState";

export function useNodeEntranceFade(
  drawNodes: (Node | LineNode)[],
  stageRef: RefObject<Konva.Stage | null>,
) {
  const seenNodeIdsRef = useRef<Set<string> | null>(null);
  // Entrance fade for newly added images/shapes. Opacity is the only safe
  // channel here: x/y/scale are controlled props that react-konva would reset
  // on the next render, but opacity is left untouched, so an imperative tween
  // survives re-renders. Strokes ("line") are skipped — a drawn line shouldn't
  // fade in. The first pass just records existing ids so a restored scene
  // doesn't replay the entrance for every object at once.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const currentIds = new Set(drawNodes.map((n) => n.id));

    if (seenNodeIdsRef.current === null) {
      seenNodeIdsRef.current = currentIds;
      return;
    }

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reduceMotion) {
      const seen = seenNodeIdsRef.current;
      for (const node of drawNodes) {
        if (node.type === "line" || seen.has(node.id)) continue;
        const konvaNode = stage.findOne<Konva.Node>(`#${node.id}`);
        if (!konvaNode) continue;
        konvaNode.opacity(0);
        new Konva.Tween({
          node: konvaNode,
          opacity: 1,
          duration: 0.26,
          easing: Konva.Easings.EaseOut,
        }).play();
      }
    }

    seenNodeIdsRef.current = currentIds;
  }, [drawNodes, stageRef]);
}

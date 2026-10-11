import type { Node } from "../Node";
import type { LineNode, SceneState, SerializedNodeData } from "./SceneState";

type SceneSettings = Pick<
  SceneState,
  "brushColor" | "brushSize" | "eraserSize" | "fillColor" | "aspectRatioType"
>;
interface SceneDocument extends SceneSettings {
  version: "2.0";
  drawNodes: ((SerializedNodeData & { imageDataUrl?: string }) | LineNode)[];
  inpaintLineNodes: LineNode[];
}

export async function encodeSceneDocument(
  state: SceneSettings & Pick<SceneState, "drawNodes" | "inpaintLineNodes">,
): Promise<string> {
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processedDrawNodes = await Promise.all(
    state.drawNodes.map(async (n) => {
      if (n.type === "line") {
        return JSON.parse(JSON.stringify(n));
      }

      const node = n as Node;
      const nodeData = {
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fill: node.fill,
        type: node.type,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        draggable: node.draggable,
        imageUrl: node.imageUrl,
        backgroundColor: node.backgroundColor,
        rotation: node.rotation || 0,
        scaleX: node.scaleX || 1,
        scaleY: node.scaleY || 1,
        offsetX: node.offsetX || 0,
        offsetY: node.offsetY || 0,
        locked: node.locked || false,
      };

      if (node.imageFile && node.imageFile instanceof File) {
        try {
          const base64 = await fileToBase64(node.imageFile);
          return { ...nodeData, imageDataUrl: base64 };
        } catch (error) {
          console.error("Failed to convert image file to base64:", error);
        }
      }

      return nodeData;
    }),
  );

  const sceneData = {
    drawNodes: processedDrawNodes,
    inpaintLineNodes: JSON.parse(JSON.stringify(state.inpaintLineNodes)),
    brushColor: state.brushColor,
    brushSize: state.brushSize,
    eraserSize: state.eraserSize,
    fillColor: state.fillColor,
    aspectRatioType: state.aspectRatioType,
    version: "2.0",
  };

  return JSON.stringify(sceneData, null, 2);
}

export function decodeSceneDocument(json: string): SceneDocument {
  const data = JSON.parse(json);
  if (
    data?.version !== "2.0" ||
    !Array.isArray(data.drawNodes) ||
    !Array.isArray(data.inpaintLineNodes) ||
    !data.drawNodes.every(isStoredNode) ||
    !data.inpaintLineNodes.every(
      (node: unknown) =>
        isStoredNode(node) && (node as LineNode).type === "line",
    ) ||
    typeof data.brushColor !== "string" ||
    typeof data.fillColor !== "string" ||
    !Number.isFinite(data.brushSize) ||
    !Number.isFinite(data.eraserSize) ||
    !["2:3", "3:2", "1:1", "none"].includes(data.aspectRatioType)
  ) {
    throw new Error("Unsupported or incomplete scene document");
  }
  return data;
}

function isStoredNode(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  if (typeof node.id !== "string") return false;
  if (node.type === "line") {
    return (
      Array.isArray(node.points) &&
      node.points.every(Number.isFinite) &&
      typeof node.stroke === "string" &&
      Number.isFinite(node.strokeWidth)
    );
  }
  return (
    ["rectangle", "circle", "triangle", "image"].includes(String(node.type)) &&
    [node.x, node.y, node.width, node.height].every(Number.isFinite) &&
    typeof node.fill === "string" &&
    (node.imageDataUrl === undefined ||
      typeof node.imageDataUrl === "string") &&
    (node.imageUrl === undefined || typeof node.imageUrl === "string")
  );
}

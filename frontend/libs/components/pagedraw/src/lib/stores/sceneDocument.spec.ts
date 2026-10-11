import { Node } from "../Node";
import { AspectRatioType, useSceneStore } from "./SceneState";
import { encodeSceneDocument, decodeSceneDocument } from "./sceneDocument";

describe("current canvas scene documents", () => {
  afterEach(() =>
    useSceneStore.setState(useSceneStore.getInitialState(), true),
  );

  it("round-trips shape/brush order and settings in version 2.0", async () => {
    const shape = new Node({
      id: "shape",
      type: "rectangle",
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      fill: "blue",
      rotation: 35,
    });
    const line = {
      id: "line",
      type: "line" as const,
      points: [0, 1, 2, 3],
      stroke: "red",
      strokeWidth: 7,
      draggable: false,
    };
    const state = {
      ...useSceneStore.getInitialState(),
      drawNodes: [shape, line],
      brushSize: 12,
      aspectRatioType: AspectRatioType.SQUARE,
    };
    const json = await encodeSceneDocument(state);
    expect(decodeSceneDocument(json).drawNodes.map((node) => node.id)).toEqual([
      "shape",
      "line",
    ]);
    expect(useSceneStore.getState().importSceneFromJson(json)).toBe(true);
    const restored = useSceneStore.getState();
    expect(restored.drawNodes[0]).toBeInstanceOf(Node);
    expect(restored.drawNodes[0].rotation).toBe(35);
    expect(restored.drawNodes[1]).toEqual(line);
    expect(restored.brushSize).toBe(12);
    expect(restored.aspectRatioType).toBe(AspectRatioType.SQUARE);
  });

  it("rejects old and incomplete documents before changing the canvas", async () => {
    const original = useSceneStore.getState();
    const valid = JSON.parse(await original.exportSceneAsJson());
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      for (const document of [
        { ...valid, version: undefined },
        { ...valid, version: "1.0" },
        { ...valid, drawNodes: [null] },
        { ...valid, inpaintLineNodes: [{ type: "line", points: "bad" }] },
        { ...valid, brushSize: undefined },
      ]) {
        expect(original.importSceneFromJson(JSON.stringify(document))).toBe(
          false,
        );
        expect(useSceneStore.getState()).toBe(original);
      }
    } finally {
      error.mockRestore();
    }
  });
});

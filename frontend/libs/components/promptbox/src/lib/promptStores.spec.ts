import { beforeEach, describe, expect, it } from "vitest";
import { usePrompt2DStore } from "./prompt2DStore";
import { usePrompt3DStore } from "./prompt3DStore";
import { usePromptImageStore } from "./promptImageStore";
import { usePromptVideoStore } from "./promptVideoStore";
import { useEnterToGenerateStore } from "./enterToGenerateStore";

beforeEach(() => {
  usePrompt3DStore.setState({ promptHistory: [] });
  localStorage.clear();
});

describe("prompt state ownership", () => {
  it("keeps page prompts independent and stores canonical resolution values", () => {
    usePromptImageStore.getState().setPrompt("image prompt");
    usePromptVideoStore.getState().setPrompt("video prompt");
    usePrompt2DStore.getState().setResolution("four_k");
    expect(usePromptImageStore.getState().prompt).toBe("image prompt");
    expect(usePromptVideoStore.getState().prompt).toBe("video prompt");
    expect(usePrompt2DStore.getState().resolution).toBe("four_k");
    expect(usePromptVideoStore.getState().resolution).toBe("seven_twenty_p");
  });

  it("keeps the newest 20 distinct nonempty scene prompts", () => {
    const store = usePrompt3DStore.getState();
    for (let i = 0; i < 25; i++) store.pushPromptHistory(`prompt ${i}`);
    store.pushPromptHistory(" prompt 10 ");
    store.pushPromptHistory("   ");
    const history = usePrompt3DStore.getState().promptHistory;
    expect(history).toHaveLength(20);
    expect(history[0]).toBe("prompt 10");
    expect(history.filter((entry) => entry === "prompt 10")).toHaveLength(1);
    expect(history).not.toContain("prompt 0");
  });

  it("persists and clears the Enter preference with the state change", () => {
    useEnterToGenerateStore.getState().setEnabled(true);
    expect(localStorage.getItem("artcraft_enter_to_generate")).toBe("true");
    expect(useEnterToGenerateStore.getState().enabled).toBe(true);
    useEnterToGenerateStore.getState().setEnabled(false);
    expect(localStorage.getItem("artcraft_enter_to_generate")).toBeNull();
    expect(useEnterToGenerateStore.getState().enabled).toBe(false);
  });
});

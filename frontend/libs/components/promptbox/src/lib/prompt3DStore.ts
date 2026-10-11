import { create } from "zustand";
import type { RefImage } from "./promptMedia";
import type { PromptResolution } from "./promptResolution";

// Newest first; capped so the history popover stays tidy.
const MAX_PROMPT_HISTORY = 20;

interface Prompt3DStore {
  prompt: string;
  resolution: PromptResolution;
  useSystemPrompt: boolean;
  referenceImages: RefImage[];
  promptHistory: string[];
  setPrompt: (prompt: string) => void;
  setResolution: (resolution: PromptResolution) => void;
  setUseSystemPrompt: (value: boolean) => void;
  setReferenceImages: (images: RefImage[]) => void;
  pushPromptHistory: (prompt: string) => void;
}

export const usePrompt3DStore = create<Prompt3DStore>()((set) => ({
  prompt: "",
  resolution: "one_k",
  useSystemPrompt: true,
  referenceImages: [],
  promptHistory: [],
  setPrompt: (prompt) => set({ prompt }),
  setResolution: (resolution) => set({ resolution }),
  setUseSystemPrompt: (useSystemPrompt) => set({ useSystemPrompt }),
  setReferenceImages: (referenceImages) => set({ referenceImages }),
  pushPromptHistory: (prompt) =>
    set((state) => {
      const trimmed = prompt.trim();
      if (!trimmed) return state;
      // De-dupe: drop any existing copy, then unshift so it's newest-first.
      const next = [
        trimmed,
        ...state.promptHistory.filter((p) => p !== trimmed),
      ].slice(0, MAX_PROMPT_HISTORY);
      return { promptHistory: next };
    }),
}));

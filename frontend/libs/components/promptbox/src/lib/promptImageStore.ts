import { create } from "zustand";
import type { RefImage } from "./promptMedia";
import {
  CommonAspectRatio,
  CommonResolution,
  CommonQuality,
} from "@storyteller/model-list";

interface PromptImageStore {
  prompt: string;
  useSystemPrompt: boolean;
  referenceImages: RefImage[];
  generationCount: number;
  commonAspectRatio: CommonAspectRatio | undefined;
  commonResolution: CommonResolution | undefined;
  commonQuality: CommonQuality | undefined;
  setPrompt: (prompt: string) => void;
  setUseSystemPrompt: (value: boolean) => void;
  setReferenceImages: (images: RefImage[]) => void;
  setGenerationCount: (count: number) => void;
  setCommonAspectRatio: (ratio: CommonAspectRatio | undefined) => void;
  setCommonResolution: (resolution: CommonResolution | undefined) => void;
  setCommonQuality: (quality: CommonQuality | undefined) => void;
}

export const usePromptImageStore = create<PromptImageStore>()((set) => ({
  prompt: "",
  useSystemPrompt: true,
  referenceImages: [],
  generationCount: 1,
  commonAspectRatio: undefined,
  commonResolution: undefined,
  commonQuality: undefined,
  setPrompt: (prompt) => set({ prompt }),
  setUseSystemPrompt: (useSystemPrompt) => set({ useSystemPrompt }),
  setReferenceImages: (referenceImages) => set({ referenceImages }),
  setGenerationCount: (generationCount) => set({ generationCount }),
  setCommonAspectRatio: (commonAspectRatio) => set({ commonAspectRatio }),
  setCommonResolution: (commonResolution) => set({ commonResolution }),
  setCommonQuality: (commonQuality) => set({ commonQuality }),
}));

import { create } from "zustand";
import type { RefImage } from "./promptMedia";
import type { PromptResolution } from "./promptResolution";

type EditAspectRatio = "auto" | "wide" | "tall" | "square";

interface PromptEditStore {
  referenceImages: RefImage[];
  aspectRatio: EditAspectRatio;
  resolution: PromptResolution;
  setReferenceImages: (images: RefImage[]) => void;
  setAspectRatio: (ratio: EditAspectRatio) => void;
  setResolution: (resolution: PromptResolution) => void;
}

export const usePromptEditStore = create<PromptEditStore>()((set) => ({
  referenceImages: [],
  aspectRatio: "auto",
  resolution: "one_k",
  setReferenceImages: (referenceImages) => set({ referenceImages }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setResolution: (resolution) => set({ resolution }),
}));

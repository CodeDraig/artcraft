import { create } from "zustand";
import type { RefImage, RefVideo, RefAudio } from "./promptMedia";

export type VideoInputMode = "keyframe" | "reference";

interface PromptVideoStore {
  prompt: string;
  resolution: string;
  aspectRatio: string | null;
  useSystemPrompt: boolean;
  referenceImages: RefImage[];
  endFrameImage?: RefImage;
  referenceVideos: RefVideo[];
  referenceAudios: RefAudio[];
  generateWithSound: boolean;
  duration: number | null;
  bitrate: string | null;
  outputFormat: string | null;
  inputMode: VideoInputMode;
  generationCount: number;
  setPrompt: (prompt: string) => void;
  setResolution: (resolution: string) => void;
  setAspectRatio: (aspectRatio: string | null) => void;
  setUseSystemPrompt: (value: boolean) => void;
  setReferenceImages: (images: RefImage[]) => void;
  setEndFrameImage: (image?: RefImage) => void;
  setReferenceVideos: (videos: RefVideo[]) => void;
  setReferenceAudios: (audios: RefAudio[]) => void;
  setGenerateWithSound: (value: boolean) => void;
  setDuration: (duration: number | null) => void;
  setBitrate: (bitrate: string | null) => void;
  setOutputFormat: (outputFormat: string | null) => void;
  setInputMode: (mode: VideoInputMode) => void;
  setGenerationCount: (count: number) => void;
}

export const usePromptVideoStore = create<PromptVideoStore>()((set) => ({
  prompt: "",
  resolution: "seven_twenty_p",
  aspectRatio: null,
  useSystemPrompt: true,
  referenceImages: [],
  endFrameImage: undefined,
  referenceVideos: [],
  referenceAudios: [],
  generateWithSound: true,
  duration: null,
  bitrate: null,
  outputFormat: null,
  inputMode: "reference",
  generationCount: 1,
  setPrompt: (prompt) => set({ prompt }),
  setResolution: (resolution) => set({ resolution }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setUseSystemPrompt: (useSystemPrompt) => set({ useSystemPrompt }),
  setReferenceImages: (referenceImages) => set({ referenceImages }),
  setEndFrameImage: (endFrameImage) => set({ endFrameImage }),
  setReferenceVideos: (referenceVideos) => set({ referenceVideos }),
  setReferenceAudios: (referenceAudios) => set({ referenceAudios }),
  setGenerateWithSound: (generateWithSound) => set({ generateWithSound }),
  setDuration: (duration) => set({ duration }),
  setBitrate: (bitrate) => set({ bitrate }),
  setOutputFormat: (outputFormat) => set({ outputFormat }),
  setInputMode: (inputMode) => set({ inputMode }),
  setGenerationCount: (generationCount) => set({ generationCount }),
}));

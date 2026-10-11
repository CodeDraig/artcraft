import { create } from "zustand";
import type { RefImage, RefAudio } from "./promptMedia";

interface PromptAudioStore {
  prompt: string;
  // Style/genre direction (Suno's "tags").
  stylePrompt: string;
  // Model id ("suno_music", ...) — audio models come from the omni HTTP API,
  // not the ClassyModelSelector store.
  selectedModelId: string | null;
  // Suno toggles
  isInstrumental: boolean;
  keepLyrics: boolean;
  isLoopable: boolean;
  // Suno Sounds beat controls. bpm null = "Auto" (omitted from the request).
  bpm: number | null;
  musicalKey: string;
  // Seed Audio output shaping.
  sampleRateHz: number | null;
  speed: number;
  volume: number;
  pitch: number;
  referenceAudios: RefAudio[];
  referenceImages: RefImage[];
  setPrompt: (prompt: string) => void;
  setStylePrompt: (stylePrompt: string) => void;
  setSelectedModelId: (modelId: string | null) => void;
  setIsInstrumental: (value: boolean) => void;
  setKeepLyrics: (value: boolean) => void;
  setIsLoopable: (value: boolean) => void;
  setBpm: (bpm: number | null) => void;
  setMusicalKey: (musicalKey: string) => void;
  setSampleRateHz: (sampleRateHz: number | null) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setPitch: (pitch: number) => void;
  setReferenceAudios: (audios: RefAudio[]) => void;
  setReferenceImages: (images: RefImage[]) => void;
}

export const usePromptAudioStore = create<PromptAudioStore>()((set) => ({
  prompt: "",
  stylePrompt: "",
  selectedModelId: null,
  isInstrumental: false,
  keepLyrics: false,
  isLoopable: false,
  bpm: null,
  musicalKey: "auto",
  sampleRateHz: null,
  speed: 1,
  volume: 1,
  pitch: 0,
  referenceAudios: [],
  referenceImages: [],
  setPrompt: (prompt) => set({ prompt }),
  setStylePrompt: (stylePrompt) => set({ stylePrompt }),
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
  setIsInstrumental: (isInstrumental) => set({ isInstrumental }),
  setKeepLyrics: (keepLyrics) => set({ keepLyrics }),
  setIsLoopable: (isLoopable) => set({ isLoopable }),
  setBpm: (bpm) => set({ bpm }),
  setMusicalKey: (musicalKey) => set({ musicalKey }),
  setSampleRateHz: (sampleRateHz) => set({ sampleRateHz }),
  setSpeed: (speed) => set({ speed }),
  setVolume: (volume) => set({ volume }),
  setPitch: (pitch) => set({ pitch }),
  setReferenceAudios: (referenceAudios) => set({ referenceAudios }),
  setReferenceImages: (referenceImages) => set({ referenceImages }),
}));

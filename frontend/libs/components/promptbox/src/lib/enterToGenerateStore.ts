import { create } from "zustand";

// Controls how the Enter key behaves inside prompt boxes.
//   false (default): Both Enter and Shift+Enter insert a newline; only the button submits.
//   true:            Enter submits; Shift+Enter inserts a newline.
// Persisted to localStorage so the choice survives reloads.
const ENTER_TO_GENERATE_STORAGE_KEY = "artcraft_enter_to_generate";

const readEnterToGenerate = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(ENTER_TO_GENERATE_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
};

const writeEnterToGenerate = (enabled: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(ENTER_TO_GENERATE_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(ENTER_TO_GENERATE_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

interface EnterToGenerateStore {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useEnterToGenerateStore = create<EnterToGenerateStore>()(
  (set) => ({
    enabled: readEnterToGenerate(),
    setEnabled: (enabled) => {
      writeEnterToGenerate(enabled);
      set({ enabled });
    },
  }),
);

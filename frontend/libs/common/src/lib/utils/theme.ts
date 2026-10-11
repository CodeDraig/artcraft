export type AppTheme = "light" | "gray" | "black" | "aurora" | "sunset";

export const THEME_STORAGE_KEY = "st-theme";

export function getStoredTheme(): AppTheme {
  const value = (localStorage.getItem(THEME_STORAGE_KEY) || "").trim();
  switch (value) {
    case "light":
    case "gray":
    case "black":
    case "aurora":
    case "sunset":
      return value;
    default:
      return "gray";
  }
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const previous = Array.from(root.classList).filter((value) =>
    value.startsWith("theme-"),
  );
  root.classList.remove(...previous);
  root.classList.add(`theme-${theme}`);
}

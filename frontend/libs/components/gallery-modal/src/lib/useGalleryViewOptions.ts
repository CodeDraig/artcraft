import { useEffect, useState } from "react";

const SHOW_UPLOADS_STORAGE_KEY = "gallery-modal-show-uploads";

export function useGalleryViewOptions() {
  const minColumns = 3;
  const maxColumns = 12;
  // Default gridColumns to 5 on desktop; narrow screens are locked to 2 columns
  const defaultGridColumns = 5;
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640,
  );
  useEffect(() => {
    const handler = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [sliderValue, setSliderValue] = useState(
    maxColumns - (defaultGridColumns - minColumns),
  );
  const gridColumns = isNarrow ? 2 : maxColumns - (sliderValue - minColumns);
  const [imageFit, setImageFit] = useState<"cover" | "contain">("contain");
  const [showUploads, setShowUploads] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SHOW_UPLOADS_STORAGE_KEY);
      return stored === null ? false : stored === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SHOW_UPLOADS_STORAGE_KEY, String(showUploads));
    } catch {
      // ignore
    }
  }, [showUploads]);
  return {
    minColumns,
    maxColumns,
    sliderValue,
    setSliderValue,
    gridColumns,
    imageFit,
    setImageFit,
    showUploads,
    setShowUploads,
  };
}

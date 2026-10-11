import { UploadIcon } from "lucide-react";
import { type Board } from "./StoryboardStore";

// ─── MainPreview ──────────────────────────────────────────────────────────────

export const MainPreview = ({
  board,
  onUploadClick,
}: {
  board: Board | null;
  onUploadClick: () => void;
}) => (
  <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-ui-background">
    {board === null ? (
      <p className="text-sm text-base-fg/30">Select a shot</p>
    ) : board.imageDataUrl ? (
      <>
        <img
          src={board.imageDataUrl}
          alt={board.title || `Shot ${board.shotNumber}`}
          className="max-h-full max-w-full object-contain"
          style={{ pointerEvents: "none" }}
        />
        {board.title && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 border border-white/15 bg-black/70 px-4 py-2">
            <p className="text-sm font-medium text-white">{board.title}</p>
          </div>
        )}
      </>
    ) : (
      <button
        onClick={onUploadClick}
        className="flex flex-col items-center gap-3 border border-dashed border-white/20 bg-white/[0.015] p-12 text-base-fg/40 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-base-fg/70"
      >
        <UploadIcon className="text-3xl" />
        <span className="text-sm">Click to upload an image</span>
      </button>
    )}
  </div>
);

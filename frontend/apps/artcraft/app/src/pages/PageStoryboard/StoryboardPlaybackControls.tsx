import {
  FastForwardIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react";
import { DynamicIcon } from "@storyteller/icons";
import { formatTime } from "./storyboardTiming";

// ─── PlaybackControls ─────────────────────────────────────────────────────────

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTimeSeconds: number;
  totalDuration: number;
  currentBoardNumber: number | null;
  totalBoards: number;
  onPlay: () => void;
  onPause: () => void;
  onPrevBoard: () => void;
  onNextBoard: () => void;
  onPrevScene: () => void;
  onNextScene: () => void;
}

export const PlaybackControls = ({
  isPlaying,
  currentTimeSeconds,
  totalDuration,
  currentBoardNumber,
  totalBoards,
  onPlay,
  onPause,
  onPrevBoard,
  onNextBoard,
  onPrevScene,
  onNextScene,
}: PlaybackControlsProps) => {
  const transportBtnClass =
    "flex h-9 w-9 items-center justify-center rounded-[3px] text-base-fg/70 transition-colors hover:bg-white/10 hover:text-base-fg active:scale-95";

  return (
    <div className="flex h-[52px] shrink-0 items-center border-t border-ui-panel-border bg-ui-background px-4">
      {/* Left stats */}
      <div className="flex w-32 flex-col">
        <span className="font-mono text-xs tabular-nums text-base-fg/60">
          {formatTime(currentTimeSeconds)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-base-fg/30">
          {currentBoardNumber !== null ? `Shot ${currentBoardNumber}` : "—"}
        </span>
      </div>

      {/* Transport buttons — centered */}
      <div className="flex flex-1 items-center justify-center gap-1">
        <button
          className={transportBtnClass}
          onClick={onPrevScene}
          title="Go to start (Ctrl+←)"
        >
          <RewindIcon />
        </button>
        <button
          className={transportBtnClass}
          onClick={onPrevBoard}
          title="Previous shot (←)"
        >
          <SkipBackIcon />
        </button>

        {/* Play / Pause */}
        <button
          className="mx-1 flex h-10 w-10 items-center justify-center rounded-[3px] bg-white text-black transition-all hover:bg-white/85 active:scale-95"
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          <DynamicIcon
            icon={isPlaying ? PauseIcon : PlayIcon}
            className="text-sm"
          />
        </button>

        <button
          className={transportBtnClass}
          onClick={onNextBoard}
          title="Next shot (→)"
        >
          <SkipForwardIcon />
        </button>
        <button
          className={transportBtnClass}
          onClick={onNextScene}
          title="Go to end (Ctrl+→)"
        >
          <FastForwardIcon />
        </button>
      </div>

      {/* Right stats */}
      <div className="flex w-32 flex-col items-end">
        <span className="font-mono text-xs tabular-nums text-base-fg/60">
          {formatTime(totalDuration)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-base-fg/30">
          {totalBoards} shot{totalBoards !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
};

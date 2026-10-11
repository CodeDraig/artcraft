import { type Board } from "./StoryboardStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface BoardTiming {
  board: Board;
  startTime: number;
}

export const buildBoardTimings = (boards: Board[]): BoardTiming[] => {
  let t = 0;
  return boards.map((board) => {
    const startTime = t;
    t += board.duration;
    return { board, startTime };
  });
};

export const formatTime = (s: number): string => {
  const clamped = Math.max(0, s);
  const mins = Math.floor(clamped / 60);
  const secs = (clamped % 60).toFixed(1);
  return mins > 0 ? `${mins}:${secs.padStart(4, "0")}` : `${secs}s`;
};

import { useState, useRef, useCallback, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { type Board } from "./StoryboardStore";
import { BoardTiming, buildBoardTimings, formatTime } from "./storyboardTiming";

const PIXELS_PER_SECOND = 80;

const MIN_BLOCK_WIDTH = 40;

const MIN_DURATION = 0.5;

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineDragState {
  boardId: string;
  boardIndex: number;
  caretX: number;
  insertionIndex: number;
}

interface TimelineProps {
  boards: Board[];
  selectedBoardId: string | null;
  currentTimeSeconds: number;
  onSelectBoard: (id: string, startTime: number) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onSeek: (time: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export const Timeline = ({
  boards,
  selectedBoardId,
  currentTimeSeconds,
  onSelectBoard,
  onUpdateDuration,
  onSeek,
  onReorder,
}: TimelineProps) => {
  const laneRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    id: string;
    startX: number;
    startDuration: number;
  } | null>(null);
  // Store full drag data in a ref so onUp can read it without going through a setState updater
  const activeDragRef = useRef<{
    boardId: string;
    boardIndex: number;
    insertionIndex: number;
    caretX: number;
  } | null>(null);
  const [dragState, setDragState] = useState<TimelineDragState | null>(null);

  const boardTimings: BoardTiming[] = useMemo(
    () => buildBoardTimings(boards),
    [boards],
  );
  const totalDuration = boardTimings.reduce(
    (s, { board }) => s + board.duration,
    0,
  );
  const totalWidth = Math.max(totalDuration * PIXELS_PER_SECOND, 300);

  // ── Resize handlers ──────────────────────────────────────────────────────

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, id: string, currentDuration: number) => {
      e.stopPropagation();
      e.preventDefault();
      resizeRef.current = {
        id,
        startX: e.clientX,
        startDuration: currentDuration,
      };

      const onMove = (ev: PointerEvent) => {
        if (!resizeRef.current) return;
        const delta = ev.clientX - resizeRef.current.startX;
        const newDuration = Math.max(
          MIN_DURATION,
          parseFloat(
            (
              resizeRef.current.startDuration +
              delta / PIXELS_PER_SECOND
            ).toFixed(1),
          ),
        );
        onUpdateDuration(resizeRef.current.id, newDuration);
      };

      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onUpdateDuration],
  );

  // ── Drag-to-rearrange handlers ───────────────────────────────────────────

  const computeInsertionFromPointerX = useCallback(
    (
      pointerX: number,
      fromIndex: number,
    ): { caretX: number; insertionIndex: number } => {
      let insertionIndex = boardTimings.length;
      let caretX = totalWidth;

      for (let i = 0; i < boardTimings.length; i++) {
        if (i === fromIndex) continue;
        const { startTime, board } = boardTimings[i];
        const midX = (startTime + board.duration / 2) * PIXELS_PER_SECOND;
        if (pointerX < midX) {
          insertionIndex = i;
          caretX = startTime * PIXELS_PER_SECOND;
          break;
        } else {
          insertionIndex = i + 1;
          caretX = (startTime + board.duration) * PIXELS_PER_SECOND;
        }
      }

      return { caretX, insertionIndex };
    },
    [boardTimings, totalWidth],
  );

  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent, boardId: string, boardIndex: number) => {
      // Don't initiate drag if clicking the resize handle
      if ((e.target as HTMLElement).dataset.resize) return;
      e.stopPropagation();
      e.preventDefault();

      activeDragRef.current = {
        boardId,
        boardIndex,
        insertionIndex: boardIndex,
        caretX: 0,
      };

      const onMove = (ev: PointerEvent) => {
        if (!activeDragRef.current || !laneRef.current) return;
        const rect = laneRef.current.getBoundingClientRect();
        const scrollLeft = laneRef.current.scrollLeft;
        const pointerX = ev.clientX - rect.left + scrollLeft;
        const { caretX, insertionIndex } = computeInsertionFromPointerX(
          pointerX,
          activeDragRef.current.boardIndex,
        );
        activeDragRef.current = {
          ...activeDragRef.current,
          caretX,
          insertionIndex,
        };
        setDragState({ boardId, boardIndex, caretX, insertionIndex });
      };

      const onUp = () => {
        // Read from ref synchronously — setState updaters run async so can't rely on them
        if (activeDragRef.current) {
          const { boardIndex: fromIdx, insertionIndex } = activeDragRef.current;
          // If moving forward, subtract 1 because the item is removed first before inserting
          const toIndex =
            insertionIndex > fromIdx ? insertionIndex - 1 : insertionIndex;
          if (toIndex !== fromIdx) {
            onReorder(fromIdx, toIndex);
          }
          activeDragRef.current = null;
        }
        setDragState(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [computeInsertionFromPointerX, onReorder],
  );

  // ── Seek by clicking empty lane area ─────────────────────────────────────

  const handleLanePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!laneRef.current) return;
      const rect = laneRef.current.getBoundingClientRect();
      const scrollLeft = laneRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const time = Math.min(Math.max(0, x / PIXELS_PER_SECOND), totalDuration);
      onSeek(time);

      const hit = boardTimings.find(
        ({ board, startTime }) =>
          x >= startTime * PIXELS_PER_SECOND &&
          x < (startTime + board.duration) * PIXELS_PER_SECOND,
      );
      if (hit) onSelectBoard(hit.board.id, hit.startTime);
    },
    [boardTimings, totalDuration, onSeek, onSelectBoard],
  );

  const playheadLeft = currentTimeSeconds * PIXELS_PER_SECOND;

  return (
    <div className="shrink-0 border-t border-ui-panel-border bg-ui-panel">
      {/* Header row */}
      <div className="border-ui-panel-border/40 flex items-center justify-between border-b px-3 py-1">
        <span className="font-mono text-xs tabular-nums text-base-fg/50">
          {formatTime(currentTimeSeconds)}
        </span>
        <span className="hud-label text-base-fg/25">Timeline</span>
        <span className="font-mono text-xs tabular-nums text-base-fg/50">
          {formatTime(totalDuration)}
        </span>
      </div>

      {/* Lane */}
      <div
        ref={laneRef}
        className="relative h-[90px] overflow-x-auto overflow-y-hidden"
        style={{ cursor: dragState ? "grabbing" : "crosshair" }}
        onPointerDown={handleLanePointerDown}
      >
        <div className="relative h-full" style={{ width: totalWidth + 40 }}>
          {/* Ruler ticks */}
          {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
            <div
              key={i}
              className="pointer-events-none absolute top-0 flex flex-col items-center"
              style={{ left: i * PIXELS_PER_SECOND }}
            >
              <div className="h-2 w-px bg-white/10" />
              <span className="font-mono text-[9px] tabular-nums text-base-fg/25">
                {i}s
              </span>
            </div>
          ))}

          {/* Board blocks */}
          {boardTimings.map(({ board, startTime }, idx) => {
            const blockWidth = Math.max(
              MIN_BLOCK_WIDTH,
              board.duration * PIXELS_PER_SECOND,
            );
            const isSelected = board.id === selectedBoardId;
            const isDragging = dragState?.boardId === board.id;

            return (
              <div
                key={board.id}
                className={twMerge(
                  "absolute bottom-1 top-6 flex items-stretch overflow-hidden border transition-colors",
                  isSelected
                    ? "border-white bg-white/15"
                    : "border-white/15 bg-white/5 hover:bg-white/10",
                )}
                style={{
                  left: startTime * PIXELS_PER_SECOND + 1,
                  width: blockWidth - 2,
                  opacity: isDragging ? 0.5 : 1,
                  filter: isDragging ? "saturate(1.4)" : undefined,
                  cursor: "grab",
                  userSelect: "none",
                }}
                onPointerDown={(e) => handleBoardPointerDown(e, board.id, idx)}
              >
                {board.imageDataUrl && (
                  <img
                    src={board.imageDataUrl}
                    className="h-full w-8 shrink-0 object-cover opacity-50"
                    alt=""
                    style={{ pointerEvents: "none" }}
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-1.5">
                  <span className="truncate text-[10px] font-semibold text-base-fg/80">
                    {board.shotNumber}
                    {board.title ? ` · ${board.title}` : ""}
                  </span>
                  {board.dialogue && (
                    <span className="truncate text-[9px] italic text-base-fg/40">
                      "{board.dialogue}"
                    </span>
                  )}
                  <span className="font-mono text-[9px] tabular-nums text-base-fg/30">
                    {board.duration.toFixed(1)}s
                  </span>
                </div>

                {/* Resize handle */}
                <div
                  data-resize="true"
                  className="absolute bottom-0 right-0 top-0 w-2 opacity-0 transition-opacity hover:bg-white/30 hover:opacity-100"
                  style={{ cursor: "ew-resize" }}
                  onPointerDown={(e) =>
                    handleResizePointerDown(e, board.id, board.duration)
                  }
                  title="Drag to resize duration"
                />
              </div>
            );
          })}

          {/* Drag insertion caret */}
          {dragState && (
            <div
              className="pointer-events-none absolute bottom-0 top-5 z-30 w-0.5 bg-yellow-400"
              style={{ left: dragState.caretX }}
            >
              {/* Downward-pointing triangle at top */}
              <div className="absolute -left-[5px] -top-[6px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-yellow-400" />
            </div>
          )}

          {/* Playhead */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-white"
            style={{ left: playheadLeft }}
          >
            <div className="absolute -left-[4px] top-0 h-0 w-0 border-x-[4px] border-t-[7px] border-x-transparent border-t-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

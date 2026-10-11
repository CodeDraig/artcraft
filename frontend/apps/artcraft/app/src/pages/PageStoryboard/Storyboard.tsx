import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useStoryboardStore, type Board } from "./StoryboardStore";
import { buildBoardTimings } from "./storyboardTiming";
import { EmptyState } from "./StoryboardEmptyState";
import { MetadataEditor } from "./StoryboardMetadataEditor";
import { MainPreview } from "./StoryboardPreview";
import { SketchCanvas } from "./SketchCanvas";
import { Filmstrip } from "./StoryboardFilmstrip";
import { Timeline } from "./StoryboardTimeline";
import { PlaybackControls } from "./StoryboardPlaybackControls";

// ─── Storyboard ───────────────────────────────────────────────────────────────

export const Storyboard = () => {
  const boards = useStoryboardStore((s) => s.boards);
  const selectedBoardId = useStoryboardStore((s) => s.selectedBoardId);
  const addBoard = useStoryboardStore((s) => s.addBoard);
  const deleteBoard = useStoryboardStore((s) => s.deleteBoard);
  const selectBoard = useStoryboardStore((s) => s.selectBoard);
  const updateBoard = useStoryboardStore((s) => s.updateBoard);
  const reorderBoards = useStoryboardStore((s) => s.reorderBoards);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSketchMode, setIsSketchMode] = useState(false);

  // Refs for playback rAF loop (avoid stale closures)
  const currentTimeRef = useRef(0);
  const boardsRef = useRef<Board[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Keep refs in sync — currentTimeRef is updated manually in every handler and in the rAF
  // tick itself, so we do NOT sync it here (that would race with and reset manual updates).
  useEffect(() => { boardsRef.current = boards; }, [boards]);

  // selectedBoardId ref so the rAF tick can check current selection without a stale closure
  const selectedBoardIdRef = useRef<string | null>(selectedBoardId);
  useEffect(() => { selectedBoardIdRef.current = selectedBoardId; }, [selectedBoardId]);

  const boardTimings = useMemo(() => buildBoardTimings(boards), [boards]);
  const totalDuration = boardTimings.reduce((s, { board }) => s + board.duration, 0);
  const selectedBoard = boards.find((b) => b.id === selectedBoardId) ?? null;

  // ── Playback engine ────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      const last = lastTimestampRef.current;
      if (last !== null) {
        const delta = (timestamp - last) / 1000;
        const nextTime = currentTimeRef.current + delta;
        const timings = buildBoardTimings(boardsRef.current);
        const dur = timings.reduce((s, { board }) => s + board.duration, 0);

        if (nextTime >= dur) {
          // Reached end — stop
          setCurrentTimeSeconds(dur);
          currentTimeRef.current = dur;
          stopPlayback();
          return;
        }

        setCurrentTimeSeconds(nextTime);
        currentTimeRef.current = nextTime;

        // Auto-select board under playhead — use ref to avoid stale closure
        const hit = timings.find(
          ({ board, startTime }) =>
            nextTime >= startTime && nextTime < startTime + board.duration,
        );
        if (hit && hit.board.id !== selectedBoardIdRef.current) {
          selectBoard(hit.board.id);
          selectedBoardIdRef.current = hit.board.id;
        }
      }
      lastTimestampRef.current = timestamp;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Playback control actions ───────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    // If at the end, restart from beginning
    if (currentTimeRef.current >= totalDuration && totalDuration > 0) {
      setCurrentTimeSeconds(0);
      currentTimeRef.current = 0;
    }
    setIsPlaying(true);
  }, [totalDuration]);

  const handlePause = useCallback(() => stopPlayback(), [stopPlayback]);

  const handlePrevBoard = useCallback(() => {
    const timings = buildBoardTimings(boards);
    const curTime = currentTimeRef.current;
    // If we're more than 0.3s into the current board, rewind to its start
    const currentEntry = timings.find(
      ({ startTime, board }) => curTime >= startTime && curTime < startTime + board.duration,
    );
    if (currentEntry && curTime - currentEntry.startTime > 0.3) {
      setCurrentTimeSeconds(currentEntry.startTime);
      currentTimeRef.current = currentEntry.startTime;
      selectBoard(currentEntry.board.id);
      return;
    }
    // Otherwise go to start of previous board
    const idx = timings.findIndex(({ board }) => board.id === selectedBoardId);
    const prevEntry = idx > 0 ? timings[idx - 1] : timings[0];
    if (prevEntry) {
      setCurrentTimeSeconds(prevEntry.startTime);
      currentTimeRef.current = prevEntry.startTime;
      selectBoard(prevEntry.board.id);
    }
  }, [boards, selectedBoardId, selectBoard]);

  const handleNextBoard = useCallback(() => {
    const timings = buildBoardTimings(boards);
    const idx = timings.findIndex(({ board }) => board.id === selectedBoardId);
    const nextEntry = idx >= 0 && idx < timings.length - 1 ? timings[idx + 1] : null;
    if (nextEntry) {
      setCurrentTimeSeconds(nextEntry.startTime);
      currentTimeRef.current = nextEntry.startTime;
      selectBoard(nextEntry.board.id);
    }
  }, [boards, selectedBoardId, selectBoard]);

  const handlePrevScene = useCallback(() => {
    setCurrentTimeSeconds(0);
    currentTimeRef.current = 0;
    if (boards.length > 0) selectBoard(boards[0].id);
  }, [boards, selectBoard]);

  const handleNextScene = useCallback(() => {
    setCurrentTimeSeconds(totalDuration);
    currentTimeRef.current = totalDuration;
    stopPlayback();
  }, [totalDuration, stopPlayback]);

  // ── File upload ────────────────────────────────────────────────────────────

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedBoardId) return;
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          updateBoard(selectedBoardId, { imageDataUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [selectedBoardId, updateBoard],
  );

  // ── Filmstrip drag handlers ────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (_e: React.DragEvent, toIndex: number) => {
      const fromIndex = dragIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        reorderBoards(fromIndex, toIndex);
      }
      setDragOverIndex(null);
      dragIndexRef.current = null;
    },
    [reorderBoards],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, []);

  // ── Metadata update / delete ───────────────────────────────────────────────

  const handleUpdate = useCallback(
    (patch: Partial<Omit<Board, "id" | "shotNumber">>) => {
      if (selectedBoardId) updateBoard(selectedBoardId, patch);
    },
    [selectedBoardId, updateBoard],
  );

  const handleDelete = useCallback(() => {
    if (selectedBoardId) deleteBoard(selectedBoardId);
  }, [selectedBoardId, deleteBoard]);

  // ── Timeline callbacks ────────────────────────────────────────────────────

  const handleTimelineSelect = useCallback(
    (id: string, startTime: number) => {
      selectBoard(id);
      setCurrentTimeSeconds(startTime);
      currentTimeRef.current = startTime;
    },
    [selectBoard],
  );

  const handleSeek = useCallback((time: number) => {
    setCurrentTimeSeconds(time);
    currentTimeRef.current = time;
  }, []);

  const handleUpdateDuration = useCallback(
    (id: string, duration: number) => updateBoard(id, { duration }),
    [updateBoard],
  );

  // ── Sketch mode ────────────────────────────────────────────────────────────

  const handleSketchOpen = useCallback(() => setIsSketchMode(true), []);
  const handleSketchExit = useCallback(() => setIsSketchMode(false), []);
  const handleSketchSave = useCallback(
    (dataUrl: string) => {
      if (selectedBoardId) updateBoard(selectedBoardId, { imageDataUrl: dataUrl });
    },
    [selectedBoardId, updateBoard],
  );

  // Auto-exit sketch mode if selected board changes (otherwise canvas would hold stale drawing)
  useEffect(() => {
    if (isSketchMode) setIsSketchMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoardId]);

  // ── Derived values for PlaybackControls ──────────────────────────────────

  const currentBoardNumber = useMemo(() => {
    const hit = boardTimings.find(
      ({ startTime, board }) =>
        currentTimeSeconds >= startTime &&
        currentTimeSeconds < startTime + board.duration,
    );
    return hit?.board.shotNumber ?? null;
  }, [boardTimings, currentTimeSeconds]);

  if (boards.length === 0) {
    return <EmptyState onAdd={addBoard} />;
  }

  return (
    <div className="flex h-[calc(100vh-56px)] w-full flex-col bg-ui-background text-base-fg">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top section: metadata panel + main preview (or sketch canvas) */}
      <div className="flex flex-1 overflow-hidden">
        {selectedBoard ? (
          <MetadataEditor
            board={selectedBoard}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onUpload={handleUploadClick}
            onSketch={handleSketchOpen}
          />
        ) : (
          <div className="w-[280px] shrink-0 border-r border-ui-panel-border bg-ui-panel" />
        )}
        {isSketchMode && selectedBoard ? (
          <SketchCanvas
            key={selectedBoard.id}
            initialImageDataUrl={selectedBoard.imageDataUrl}
            onSave={handleSketchSave}
            onExit={handleSketchExit}
          />
        ) : (
          <MainPreview board={selectedBoard} onUploadClick={handleUploadClick} />
        )}
      </div>

      {/* Filmstrip */}
      <Filmstrip
        boards={boards}
        selectedBoardId={selectedBoardId}
        dragOverIndex={dragOverIndex}
        onAdd={addBoard}
        onSelect={selectBoard}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />

      {/* Timeline */}
      <Timeline
        boards={boards}
        selectedBoardId={selectedBoardId}
        currentTimeSeconds={currentTimeSeconds}
        onSelectBoard={handleTimelineSelect}
        onUpdateDuration={handleUpdateDuration}
        onSeek={handleSeek}
        onReorder={reorderBoards}
      />

      {/* Playback controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentTimeSeconds={currentTimeSeconds}
        totalDuration={totalDuration}
        currentBoardNumber={currentBoardNumber}
        totalBoards={boards.length}
        onPlay={handlePlay}
        onPause={handlePause}
        onPrevBoard={handlePrevBoard}
        onNextBoard={handleNextBoard}
        onPrevScene={handlePrevScene}
        onNextScene={handleNextScene}
      />
    </div>
  );
};

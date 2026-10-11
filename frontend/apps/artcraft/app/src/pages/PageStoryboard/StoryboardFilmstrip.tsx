import { ImagesIcon, PlusIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { type Board } from "./StoryboardStore";

// ─── ThumbnailItem ────────────────────────────────────────────────────────────

interface ThumbnailItemProps {
  board: Board;
  index: number;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const ThumbnailItem = ({
  board,
  index,
  isSelected,
  isDragOver,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ThumbnailItemProps) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragOver={(e) => {
      e.preventDefault();
      onDragOver(e, index);
    }}
    onDrop={(e) => onDrop(e, index)}
    onDragEnd={onDragEnd}
    onClick={onSelect}
    className={twMerge(
      "relative flex h-[60px] w-[100px] shrink-0 cursor-pointer select-none overflow-hidden rounded-[3px] border transition-all",
      isSelected ? "border-white" : "border-white/15 hover:border-white/30",
      isDragOver && "border-white/60 opacity-60",
    )}
  >
    {board.imageDataUrl ? (
      <img
        src={board.imageDataUrl}
        alt=""
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-white/5">
        <ImagesIcon className="text-lg text-base-fg/20" />
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
      <span className="font-mono text-[10px] tabular-nums text-white/85">
        {board.shotNumber}
      </span>
    </div>
  </div>
);

// ─── Filmstrip ────────────────────────────────────────────────────────────────

interface FilmstripProps {
  boards: Board[];
  selectedBoardId: string | null;
  dragOverIndex: number | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

export const Filmstrip = ({
  boards,
  selectedBoardId,
  dragOverIndex,
  onAdd,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: FilmstripProps) => (
  <div className="flex h-[80px] shrink-0 items-center gap-2 overflow-x-auto border-t border-ui-panel-border bg-ui-panel px-3">
    <button
      onClick={onAdd}
      className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[3px] border border-dashed border-white/20 bg-white/[0.015] text-base-fg/40 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-base-fg"
      title="Add shot"
    >
      <PlusIcon />
    </button>

    {boards.map((board, index) => (
      <ThumbnailItem
        key={board.id}
        board={board}
        index={index}
        isSelected={board.id === selectedBoardId}
        isDragOver={dragOverIndex === index}
        onSelect={() => onSelect(board.id)}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      />
    ))}
  </div>
);

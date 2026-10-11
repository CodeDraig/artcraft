import { PencilIcon, TrashIcon, UploadIcon } from "lucide-react";
import { Button } from "@storyteller/ui-button";
import { type Board } from "./StoryboardStore";

// ─── MetadataEditor ───────────────────────────────────────────────────────────

interface MetadataEditorProps {
  board: Board;
  onUpdate: (patch: Partial<Omit<Board, "id" | "shotNumber">>) => void;
  onDelete: () => void;
  onUpload: () => void;
  onSketch: () => void;
}

export const MetadataEditor = ({
  board,
  onUpdate,
  onDelete,
  onUpload,
  onSketch,
}: MetadataEditorProps) => (
  <aside className="flex w-[280px] shrink-0 flex-col border-r border-ui-panel-border bg-ui-panel">
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-3">
        <div className="hud-label text-base-fg/40">Shot {board.shotNumber}</div>

        <div>
          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
            Title
          </label>
          <input
            type="text"
            value={board.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Shot title"
            className="w-full rounded-[3px] border border-white/15 bg-ui-controls px-3 py-2 text-sm text-base-fg placeholder:text-base-fg/30 focus:border-white/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
            Dialogue
          </label>
          <textarea
            value={board.dialogue}
            onChange={(e) => onUpdate({ dialogue: e.target.value })}
            placeholder="Character dialogue..."
            rows={3}
            className="w-full resize-none rounded-[3px] border border-white/15 bg-ui-controls px-3 py-2 text-sm text-base-fg placeholder:text-base-fg/30 focus:border-white/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
            Action
          </label>
          <textarea
            value={board.action}
            onChange={(e) => onUpdate({ action: e.target.value })}
            placeholder="On-screen action..."
            rows={3}
            className="w-full resize-none rounded-[3px] border border-white/15 bg-ui-controls px-3 py-2 text-sm text-base-fg placeholder:text-base-fg/30 focus:border-white/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
            Notes
          </label>
          <textarea
            value={board.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Director notes..."
            rows={3}
            className="w-full resize-none rounded-[3px] border border-white/15 bg-ui-controls px-3 py-2 text-sm text-base-fg placeholder:text-base-fg/30 focus:border-white/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
            Duration (seconds)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={board.duration}
            onChange={(e) =>
              onUpdate({ duration: parseFloat(e.target.value) || 0 })
            }
            className="w-full rounded-[3px] border border-white/15 bg-ui-controls px-3 py-2 font-mono text-sm tabular-nums text-base-fg focus:border-white/60 focus:outline-none"
          />
        </div>
      </div>
    </div>

    <div className="flex flex-col gap-2 border-t border-ui-panel-border p-4">
      <Button
        variant="action"
        icon={PencilIcon}
        onClick={onSketch}
        className="w-full justify-center"
      >
        Sketch
      </Button>
      <Button
        variant="action"
        icon={UploadIcon}
        onClick={onUpload}
        className="w-full justify-center"
      >
        Upload Image
      </Button>
      <Button
        variant="action"
        icon={TrashIcon}
        onClick={onDelete}
        className="w-full justify-center text-red-400 hover:text-red-300"
      >
        Delete Shot
      </Button>
    </div>
  </aside>
);

import type React from "react";
import { twMerge } from "tailwind-merge";
import { StarIcon, FolderPlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { FolderColorRow } from "./FolderColorRow";
/** Reusable folder context menu (star + color + new subfolder + rename + delete). */
export const FolderContextMenuItems = ({
  folderId,
  hasStar,
  colorCode,
  onRename,
  onDelete,
  onNewSubfolder,
  onToggleStar,
  onSetColor,
  className,
  style,
}: {
  folderId: string;
  hasStar?: boolean;
  colorCode?: string | null;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
  onToggleStar: (id: string, hasStar: boolean) => void;
  onSetColor: (id: string, color: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={twMerge(
      "min-w-44 rounded-[3px] border border-ui-panel-border bg-ui-panel p-1 shadow-xl z-[59]",
      className,
    )}
    style={style}
  >
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-2 hover:bg-ui-controls/60 text-sm text-base-fg"
      onClick={() => onToggleStar(folderId, !hasStar)}
    >
      <StarIcon
        className={twMerge(
          "w-4",
          hasStar ? "text-amber-400" : "text-base-fg/40",
        )}
      />
      <span>{hasStar ? "Unstar" : "Star"}</span>
    </button>
    <FolderColorRow
      colorCode={colorCode}
      onSetColor={(c) => onSetColor(folderId, c)}
    />
    <div className="mx-1.5 my-1 border-t border-ui-panel-border" />
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-2 hover:bg-ui-controls/60 text-sm text-base-fg"
      onClick={() => onNewSubfolder(folderId)}
    >
      <FolderPlusIcon className="w-4" />
      <span>New subfolder</span>
    </button>
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-2 hover:bg-ui-controls/60 text-sm text-base-fg"
      onClick={() => onRename(folderId)}
    >
      <PencilIcon className="w-4" />
      <span>Rename</span>
    </button>
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-[3px] px-2 py-2 hover:bg-ui-controls/60 text-sm text-red"
      onClick={() => onDelete(folderId)}
    >
      <Trash2Icon className="w-4" />
      <span>Delete folder</span>
    </button>
  </div>
);

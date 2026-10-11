import { XIcon } from "lucide-react";
import { getPlaceholderForMediaClass } from "@storyteller/common";
import dayjs from "dayjs";
import { CompletedTask } from "./TaskCardData";
import { PromptLine, CopyPromptButton } from "./TaskPrompt";

export const CompletedCard = ({
  task,
  onClick,
  onDismiss,
}: {
  task: CompletedTask;
  onClick?: () => void;
  onDismiss?: () => void;
}) => {
  return (
    <div
      className="flex cursor-pointer items-center gap-2.5 p-2 transition-colors hover:bg-ui-controls/40"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden bg-ui-controls">
        {task.thumbnailUrl ? (
          <img
            src={task.thumbnailUrl}
            alt={task.title}
            onError={(e) => {
              e.currentTarget.src = getPlaceholderForMediaClass(
                task.mediaFileClass,
              );
              e.currentTarget.style.opacity = "0.3";
              // Set the `data-brokenurl` property for debugging the broken images:
              (e.currentTarget as HTMLImageElement).dataset.brokenurl =
                task.thumbnailUrl;
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-base-fg/40">
            Done
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-base-fg/90">
          {task.title}
        </div>
        {task.subtitle && (
          <div className="mt-0.5 truncate text-xs text-base-fg opacity-60">
            {task.subtitle}
          </div>
        )}
        {task.completedAt && (
          <div className="text-xs text-base-fg opacity-60">
            {dayjs(task.completedAt).format("MMM D, h:mm A")}
          </div>
        )}
        {task.prompt && <PromptLine prompt={task.prompt} />}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {task.prompt && <CopyPromptButton prompt={task.prompt} />}
        {onDismiss && (
          <button
            className="flex h-6 w-6 items-center justify-center text-base-fg/60 hover:bg-ui-controls"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  );
};

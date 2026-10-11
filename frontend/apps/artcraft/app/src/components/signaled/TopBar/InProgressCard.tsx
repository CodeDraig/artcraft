import { Tooltip } from "@storyteller/ui-tooltip";
import { LoaderCircleIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { InProgressTask } from "./TaskCardData";
import { PromptLine, CopyPromptButton } from "./TaskPrompt";

const formatTimeLeft = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0 && minutes > 0) return `~ ${hours}h ${minutes}m left`;
  if (hours > 0) return `~ ${hours}h left`;
  if (minutes > 0) return `~ ${minutes}m left`;
  return `~ ${seconds}s left`;
};

export const InProgressCard = ({
  task,
  onDismiss,
}: {
  task: InProgressTask;
  onDismiss?: () => void;
}) => {
  const progressPercent = Math.max(0, Math.min(100, Math.round(task.progress)));
  const isAlmostDone = task.progress >= 95;
  const timeLabel = isAlmostDone
    ? "Almost done..."
    : task.estimatedTimeLeftMs != null && task.estimatedTimeLeftMs > 0
      ? formatTimeLeft(task.estimatedTimeLeftMs)
      : null;
  const isSeedance2 = task.modelType === "seedance_2p0";
  const hasRefImages = task.refImageUrls && task.refImageUrls.length > 0;

  const thumbnailContent = hasRefImages ? (
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden">
      <img
        src={task.refImageUrls![0]}
        alt="Reference"
        className="h-full w-full object-cover opacity-50"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <LoaderCircleIcon className="animate-spin text-white/80" size="lg" />
      </div>
      {task.refImageUrls!.length > 1 && (
        <div className="absolute bottom-0.5 right-0.5 bg-black/60 px-1 text-[9px] text-white/80">
          +{task.refImageUrls!.length - 1}
        </div>
      )}
    </div>
  ) : (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden bg-ui-controls">
      <LoaderCircleIcon className="animate-spin text-base-fg/60" size="lg" />
    </div>
  );

  return (
    <div className="p-2 transition-colors hover:bg-ui-controls/40">
      <div className="flex items-center gap-2.5">
        {thumbnailContent}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 truncate font-medium text-base-fg/90">
              {task.title}
              {isSeedance2 && (
                <Tooltip
                  content="Seedance 2.0 is in Early Alpha. Generations may be slow and may experience outages."
                  position="top"
                  strategy="fixed"
                  className="w-[200px] text-wrap bg-yellow-400/60"
                  zIndex={50}
                  delay={100}
                >
                  <TriangleAlertIcon className="h-3 w-3 shrink-0 text-yellow-400/60 transition-all hover:text-yellow-400" />
                </Tooltip>
              )}
            </div>
            <div className="ml-2 shrink-0 text-xs tabular-nums text-base-fg/60">
              {progressPercent}%
            </div>
          </div>
          {task.subtitle && (
            <div className="mt-0.5 truncate text-xs text-base-fg opacity-60">
              {task.subtitle}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 bg-ui-controls">
              <div
                className="h-1.5 bg-white"
                style={{
                  width: `${Math.max(0, Math.min(100, task.progress))}%`,
                }}
              />
            </div>
          </div>
          {timeLabel && (
            <div className="mt-1 text-xs text-base-fg/50">{timeLabel}</div>
          )}
          {task.prompt && <PromptLine prompt={task.prompt} className="mt-0" />}
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
    </div>
  );
};

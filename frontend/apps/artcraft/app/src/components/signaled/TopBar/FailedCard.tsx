import { Tooltip } from "@storyteller/ui-tooltip";
import { CircleAlertIcon, XIcon } from "lucide-react";
import dayjs from "dayjs";
import { FailedTask } from "./TaskCardData";
import { PromptLine, CopyPromptButton } from "./TaskPrompt";

const FAILED_STATUS_LABEL: Record<string, string> = {
  complete_failure: "Failed",
  attempt_failed: "Failed",
  dead: "Failed",
  cancelled_by_user: "Cancelled",
  cancelled_by_provider: "Cancelled by provider",
  cancelled_by_us: "Cancelled",
};

export const FAILURE_REASON_LABEL: Record<string, string> = {
  rule_bans_user_image: "Image violates content policy",
  rule_bans_user_image_with_faces: "Images with faces are not allowed",
  rule_bans_user_text_prompt: "Text prompt violates content policy",
  rule_bans_user_content: "Content violates content policy",
  rule_bans_generated_video: "Generated video flagged by content policy",
  rule_bans_generated_audio: "Generated audio flagged by content policy",
  rule_bans_generated_content: "Generated content flagged by content policy",
  generation_failed: "Generation failed",
  unknown: "An unknown error occurred",
};

export const FailedCard = ({
  task,
  onDismiss,
}: {
  task: FailedTask;
  onDismiss?: () => void;
}) => {
  const statusLabel = FAILED_STATUS_LABEL[task.status] || "Failed";
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
      <div className="absolute inset-0 bg-red-900/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <CircleAlertIcon className="text-red-400" size="lg" />
      </div>
      {task.refImageUrls!.length > 1 && (
        <div className="absolute bottom-0.5 right-0.5 bg-black/60 px-1 text-[9px] text-white/80">
          +{task.refImageUrls!.length - 1}
        </div>
      )}
    </div>
  ) : (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden bg-red-500/10">
      <CircleAlertIcon className="text-red-400" size="lg" />
    </div>
  );

  return (
    <div className="p-2 transition-colors hover:bg-ui-controls/40">
      <div className="flex items-center gap-2.5">
        {thumbnailContent}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm">
            <div className="truncate font-medium text-base-fg/90">
              {task.title}
            </div>
          </div>
          {task.subtitle && (
            <div className="mt-0.5 truncate text-xs text-base-fg opacity-60">
              {task.subtitle}
            </div>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 bg-red-500/15 px-1.5 py-0 text-[11px] font-medium text-red-400">
              {statusLabel}
            </span>
            {task.failureReason && (
              <div className="min-w-0 overflow-hidden">
                <Tooltip
                  content={
                    task.failureMessage ? (
                      <div>
                        <div className="font-semibold">
                          {task.failureReason}
                        </div>
                        <div className="mt-0.5 font-normal opacity-80">
                          {task.failureMessage}
                        </div>
                      </div>
                    ) : (
                      task.failureReason
                    )
                  }
                  position="bottom"
                  strategy="fixed"
                  className="max-w-[280px] text-wrap bg-danger text-xs"
                  zIndex={50}
                  delay={300}
                >
                  <div className="cursor-default truncate text-[11px] text-red-400/80 underline decoration-red-400/30 decoration-dashed underline-offset-2">
                    {task.failureReason}
                  </div>
                </Tooltip>
              </div>
            )}
          </div>
          {task.failedAt && (
            <div className="mt-0.5 text-[11px] text-base-fg/40">
              {dayjs(task.failedAt).format("MMM D, h:mm A")}
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
    </div>
  );
};

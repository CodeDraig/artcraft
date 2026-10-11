import { findDesktopModel } from "@storyteller/tauri-api";
import { Tooltip } from "@storyteller/ui-tooltip";
import { PopoverMenu } from "@storyteller/ui-popover";
import { BombIcon, BrushIcon, ListChecksIcon, LoaderCircleIcon, Trash2Icon, XIcon } from "lucide-react";
import { Modal } from "@storyteller/ui-modal";
import { galleryModalLightboxMediaId, galleryModalLightboxVisible, galleryModalLightboxImage } from "@storyteller/ui-gallery-modal";
import type { GalleryItem } from "@storyteller/ui-gallery-modal";
import { useEffect, useMemo, useRef, useState } from "react";
import { GetTaskQueue, MarkTaskAsDismissed, TasksNukeAll } from "@storyteller/tauri-api";
import type { TaskQueueItem } from "@storyteller/tauri-api";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useSelectedImageModel, useSelectedVideoModel, ModelPage } from "@storyteller/ui-model-selector";
import { Button } from "@storyteller/ui-button";
import { getProviderDisplayName, ALL_MODELS_LIST, getModelDisplayName } from "@storyteller/model-list";
import { CloseButton } from "@storyteller/ui-close-button";
import { ActionReminderModal } from "@storyteller/ui-action-reminder-modal";
import { getThumbnailUrl, THUMBNAIL_SIZES } from "@storyteller/common";
import { coverImageCache } from "~/pages/PageImageTo3DObject/ImageTo3DStore";
import { useCreditsState } from "@storyteller/credits";
import { getMetaForTask, cleanupOldEntries } from "./taskEnqueueMeta";
import { InProgressTask, CompletedTask, FailedTask } from "./TaskCardData";
import { InProgressCard } from "./InProgressCard";
import { CompletedCard } from "./CompletedCard";
import { FAILURE_REASON_LABEL, FailedCard } from "./FailedCard";

export const TaskQueue = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [inProgress, setInProgress] = useState<InProgressTask[]>([]);
  const [completed, setCompleted] = useState<CompletedTask[]>([]);
  const [failed, setFailed] = useState<FailedTask[]>([]);
  const [lastReadAt, setLastReadAt] = useState<number>(() => {
    const stored = localStorage.getItem("taskQueueLastReadAt");
    return stored ? parseInt(stored, 10) : 0;
  });

  // remove unread state; unread tracking handled via IDs below
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [unreadCompletedIds, setUnreadCompletedIds] = useState<string[]>([]);
  const prevCompletedIdsRef = useRef<Set<string>>(new Set());
  // Failed-task ids already seen by the poll — seeded on first load so
  // failures from previous sessions don't trigger a credits refresh.
  const prevFailedIdsRef = useRef<Set<string>>(new Set());
  const failedSeenInitializedRef = useRef(false);
  // Confirmation state
  const [confirmationConfig, setConfirmationConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    primaryActionText: string;
    primaryActionIcon: any;
    primaryActionBtnClassName: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: null,
    primaryActionText: "",
    primaryActionIcon: Trash2Icon,
    primaryActionBtnClassName: "",
    onConfirm: async () => {},
  });

  const handleClearCompleted = (onSuccess?: () => void) => {
    setConfirmationConfig({
      isOpen: true,
      title: "Clear completed tasks?",
      message: (
        <span className="text-sm text-white/80">
          This will remove all completed tasks from the task queue.
        </span>
      ),
      primaryActionText: "Clear completed",
      primaryActionIcon: BrushIcon,
      primaryActionBtnClassName:
        "bg-green-500/10 hover:bg-green-500/20 text-green-500",
      onConfirm: async () => {
        await dismissCompleted();
        if (onSuccess) onSuccess();
      },
    });
  };

  const handleClearStale = () => {
    setConfirmationConfig({
      isOpen: true,
      title: "Clear stale tasks?",
      message: (
        <span className="text-sm text-white/80">
          This will remove all stale/stuck in-progress tasks from the queue.
        </span>
      ),
      primaryActionText: "Clear stale",
      primaryActionIcon: Trash2Icon,
      primaryActionBtnClassName:
        "bg-orange-500/10 hover:bg-orange-500/20 text-orange-500",
      onConfirm: async () => {
        await dismissStale();
      },
    });
  };

  const handleClearFailed = () => {
    setConfirmationConfig({
      isOpen: true,
      title: "Clear failed tasks?",
      message: (
        <span className="text-sm text-white/80">
          This will remove all failed/cancelled tasks from the queue.
        </span>
      ),
      primaryActionText: "Clear failed",
      primaryActionIcon: Trash2Icon,
      primaryActionBtnClassName:
        "bg-red-500/10 hover:bg-red-500/20 text-red-500",
      onConfirm: async () => {
        await dismissFailed();
      },
    });
  };

  const handleRemoveAll = () => {
    setConfirmationConfig({
      isOpen: true,
      title: "Remove all tasks?",
      message: (
        <span className="text-sm text-white/80">
          This will remove ALL tasks (completed and in-progress) from the queue.
          This cannot be undone.
        </span>
      ),
      primaryActionText: "Nuke all",
      primaryActionIcon: BombIcon,
      primaryActionBtnClassName:
        "bg-red-500/10 hover:bg-red-500/20 text-red-500",
      onConfirm: async () => {
        await dismissAll();
      },
    });
  };

  // Use currently selected models for image and video pages to drive fake progress.
  const selectedImageModel = useSelectedImageModel(ModelPage.TextToImage);
  const selectedVideoModel = useSelectedVideoModel(ModelPage.ImageToVideo);
  // Snapshot per-task duration so switching models doesn't affect existing items
  const taskDurationRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const formatTitleParts = (t: TaskQueueItem) => {
      const provider = t.provider
        ? getProviderDisplayName(String(t.provider).toLowerCase())
        : undefined;
      const taskTypeStr = t.task_type ? String(t.task_type).toLowerCase() : "";
      const modelTypeStr = t.model_type
        ? String(t.model_type).toLowerCase()
        : "";
      const isSplatModel =
        taskTypeStr.includes("gaussian") ||
        modelTypeStr.includes("marble") ||
        modelTypeStr.includes("worldlabs");
      const is3DModel =
        taskTypeStr.includes("3d") ||
        taskTypeStr.includes("object") ||
        isSplatModel;

      let kind = undefined;
      if (isSplatModel) {
        kind = "3D World";
      } else if (taskTypeStr.includes("image") && is3DModel) {
        kind = "Image to 3D";
      } else if (is3DModel) {
        kind = "3D Model";
      } else if (taskTypeStr.includes("audio")) {
        kind = "Audio";
      } else if (taskTypeStr.includes("video")) {
        kind = "Video";
      } else if (taskTypeStr.includes("image")) {
        kind = "Image";
      }

      const modelDisplay = t.model_type
        ? findDesktopModel(String(t.model_type))?.fullName ?? getModelDisplayName(String(t.model_type))
        : undefined;

      const title = kind || "Task";
      const subtitle =
        modelDisplay && provider
          ? `${modelDisplay} — ${provider}`
          : modelDisplay || provider || undefined;
      return { title, subtitle, kind };
    };

    const load = async () => {
      try {
        const result = await GetTaskQueue();

        if (cancelled) return;
        console.log("TaskQueue:GetTaskQueue result", result);

        const { tasks } = result;

        const now = Date.now();
        const inProg = tasks
          .filter(
            (t) => t.task_status === "pending" || t.task_status === "started",
          )
          .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
          .map((t: TaskQueueItem) => {
            const createdMs = t.created_at.getTime();
            const taskTypeStr = t.task_type
              ? String(t.task_type).toLowerCase()
              : "";
            const isVideo = taskTypeStr.includes("video");
            let duration = taskDurationRef.current.get(t.id);
            if (!duration) {
              const actualModel = t.model_type
                ? ALL_MODELS_LIST.find(
                    (m) => m.tauriId === t.model_type || m.id === t.model_type,
                  )
                : undefined;
              duration =
                actualModel?.progressBarTime ??
                (isVideo
                  ? selectedVideoModel?.progressBarTime
                  : selectedImageModel?.progressBarTime) ??
                20000;
              taskDurationRef.current.set(t.id, duration);
            }
            const raw = ((now - createdMs) / duration) * 100;
            const progress = Math.min(95, Math.max(0, raw));
            const elapsed = now - createdMs;
            const estimatedTimeLeftMs = Math.max(0, duration - elapsed);
            const parts = formatTitleParts(t);
            const canDismiss = now - createdMs > 5 * 60 * 1000; // 5 minutes
            const meta = getMetaForTask(
              t.id,
              t.model_type ? String(t.model_type) : undefined,
              createdMs,
            );
            return {
              id: t.id,
              title: `Generating ${parts.kind || "Task"}...`,
              subtitle: parts.subtitle,
              progress,
              updatedAt: t.updated_at,
              canDismiss,
              estimatedTimeLeftMs,
              modelType: t.model_type ? String(t.model_type) : undefined,
              prompt: meta?.prompt,
              refImageUrls: meta?.refImageUrls,
            };
          });

        // prune durations for tasks no longer in progress
        const inProgIds = new Set(inProg.map((x) => x.id));
        for (const id of Array.from(taskDurationRef.current.keys())) {
          if (!inProgIds.has(id)) {
            taskDurationRef.current.delete(id);
          }
        }

        const done = tasks
          .filter((t) => t.task_status === "complete_success")
          .sort(
            (a, b) =>
              (b.completed_at?.getTime() || b.updated_at.getTime()) -
              (a.completed_at?.getTime() || a.updated_at.getTime()),
          )
          .map((t: TaskQueueItem) => {
            const mediaToken = t.completed_item?.primary_media_file?.token;
            // Try server thumbnail first, then fall back to local cache
            const serverThumbnail = getThumbnailUrl(
              t.completed_item?.primary_media_file
                ?.maybe_thumbnail_url_template,
              { width: THUMBNAIL_SIZES.MEDIUM },
            );
            const cachedThumbnail = mediaToken
              ? coverImageCache.get(mediaToken)
              : undefined;

            const meta = getMetaForTask(
              t.id,
              t.model_type ? String(t.model_type) : undefined,
              t.created_at.getTime(),
            );

            return {
              id: t.id,
              ...formatTitleParts(t),
              thumbnailUrl: serverThumbnail || cachedThumbnail || undefined,
              prompt: meta?.prompt,
              imageUrls: t.completed_item?.primary_media_file?.cdn_url
                ? [t.completed_item?.primary_media_file?.cdn_url]
                : [],
              mediaTokens: (() => {
                const primaryToken =
                  t.completed_item?.primary_media_file?.token;
                const tokens: string[] = primaryToken ? [primaryToken] : [];
                return tokens;
              })(),
              mediaFileClass: t.completed_item?.media_file_class,
              batchImageToken: t.completed_item?.maybe_batch_token,
              completedAt: t.completed_at,
              updatedAt: t.updated_at,
            };
          });

        const FAILED_STATUSES = new Set([
          "complete_failure",
          "attempt_failed",
          "dead",
          "cancelled_by_user",
          "cancelled_by_provider",
          "cancelled_by_us",
        ]);

        const failedTasks = tasks
          .filter((t) => FAILED_STATUSES.has(t.task_status))
          .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
          .map((t: TaskQueueItem) => {
            const parts = formatTitleParts(t);
            const fr = t.failure_reason;
            const failureReason = fr
              ? FAILURE_REASON_LABEL[fr.failure_type] || undefined
              : undefined;
            const failureMessage =
              fr?.failure_message && fr.failure_type !== "unknown"
                ? fr.failure_message
                : undefined;
            const meta = getMetaForTask(
              t.id,
              t.model_type ? String(t.model_type) : undefined,
              t.created_at.getTime(),
            );
            return {
              id: t.id,
              title: parts.title || "Task",
              subtitle: parts.subtitle,
              failedAt: t.completed_at || t.updated_at,
              status: t.task_status,
              failureReason: failureReason || fr?.failure_message || undefined,
              failureMessage,
              prompt: meta?.prompt,
              refImageUrls: meta?.refImageUrls,
            };
          });

        setInProgress(inProg);
        setCompleted(done);
        setFailed(failedTasks);

        // Refresh credits when a task newly enters a failed status via the
        // poll — the "generation-failed-event" push below can be missed.
        const newFailedIdSet = new Set(failedTasks.map((t) => t.id));
        if (!failedSeenInitializedRef.current) {
          failedSeenInitializedRef.current = true;
        } else if (
          failedTasks.some((t) => !prevFailedIdsRef.current.has(t.id))
        ) {
          // Refunded credits may take a moment to settle in the database
          setTimeout(() => {
            useCreditsState.getState().fetchFromServer();
          }, 2000);
        }
        prevFailedIdsRef.current = newFailedIdSet;

        // Track newly completed IDs when popover is closed
        const newCompletedIdSet = new Set(done.map((d) => d.id));
        const newlyCompletedIds: string[] = [];
        newCompletedIdSet.forEach((id) => {
          if (!prevCompletedIdsRef.current.has(id)) {
            newlyCompletedIds.push(id);
          }
        });
        prevCompletedIdsRef.current = newCompletedIdSet;
        if (!isPopoverOpen && newlyCompletedIds.length > 0) {
          setUnreadCompletedIds((prev) =>
            Array.from(new Set([...(prev ?? []), ...newlyCompletedIds])),
          );
        }
      } catch (_) {
        // ignore
      }
    };

    cleanupOldEntries();
    load();
    const id = setInterval(load, 5000);

    // Listen for cover image uploads to refresh and show new thumbnails
    const handleCoverUploaded = () => {
      if (!cancelled) {
        // Small delay to allow server to process
        setTimeout(load, 1000);
      }
    };
    window.addEventListener("cover-image-uploaded", handleCoverUploaded);

    let unlistenComplete: Promise<UnlistenFn> | null = null;
    let unlistenFailed: Promise<UnlistenFn> | null = null;
    (async () => {
      // Update immediately when Tauri signals a generation completion
      unlistenComplete = listen("generation-complete-event", () => {
        if (!cancelled) {
          load();
        }
      });
      // Also update immediately when a generation fails
      unlistenFailed = listen("generation-failed-event", () => {
        if (!cancelled) {
          load();
          // Refunded credits may take a moment to settle in the database
          setTimeout(() => {
            useCreditsState.getState().fetchFromServer();
          }, 2000);
        }
      });
    })();
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("cover-image-uploaded", handleCoverUploaded);
      if (unlistenComplete) {
        unlistenComplete.then((f) => f());
      }
      if (unlistenFailed) {
        unlistenFailed.then((f) => f());
      }
    };
  }, [
    lastReadAt,
    selectedImageModel?.progressBarTime,
    selectedVideoModel?.progressBarTime,
    isPopoverOpen,
  ]);

  const hasNothing = useMemo(
    () =>
      inProgress.length === 0 && completed.length === 0 && failed.length === 0,
    [inProgress.length, completed.length, failed.length],
  );

  const inProgressCount = inProgress.length;
  const badgeCount = inProgressCount + (unreadCompletedIds?.length ?? 0);

  const handleOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      const now = Date.now();
      setLastReadAt(now);
      localStorage.setItem("taskQueueLastReadAt", String(now));
      setUnreadCompletedIds([]);
    }
  };

  const dismissTask = async (id: string) => {
    try {
      await MarkTaskAsDismissed(id);
      setInProgress((prev) => prev.filter((t) => t.id !== id));
      setCompleted((prev) => prev.filter((t) => t.id !== id));
      setFailed((prev) => prev.filter((t) => t.id !== id));
      setUnreadCompletedIds((prev) => (prev ?? []).filter((x) => x !== id));
      taskDurationRef.current.delete(id);
    } catch (_) {
      // ignore
    }
  };

  const dismissCompleted = async () => {
    const ids = completed.map((t) => t.id);
    try {
      await Promise.all(ids.map((id) => MarkTaskAsDismissed(id)));
    } catch (_) {
      // ignore
    } finally {
      setCompleted([]);
      setUnreadCompletedIds([]);
    }
  };

  const dismissFailed = async () => {
    const ids = failed.map((t) => t.id);
    try {
      await Promise.all(ids.map((id) => MarkTaskAsDismissed(id)));
    } catch (_) {
      // ignore
    } finally {
      setFailed([]);
    }
  };

  const dismissStale = async () => {
    const staleIds = inProgress.filter((t) => t.canDismiss).map((t) => t.id);
    try {
      await Promise.all(staleIds.map((id) => MarkTaskAsDismissed(id)));
      setInProgress((prev) => prev.filter((t) => !staleIds.includes(t.id)));
      taskDurationRef.current.forEach((_, id) => {
        if (staleIds.includes(id)) {
          taskDurationRef.current.delete(id);
        }
      });
    } catch (_) {
      // ignore
    }
  };

  const dismissAll = async () => {
    try {
      await TasksNukeAll();
    } catch (_) {
      // ignore
    } finally {
      setCompleted([]);
      setInProgress([]);
      setFailed([]);
      setUnreadCompletedIds([]);
      taskDurationRef.current.clear();
    }
  };

  return (
    <>
      <Tooltip content="Task Queue" position="bottom" closeOnClick={true}>
        <div className="relative">
          {badgeCount > 0 && (
            <div className="absolute -right-1 -top-1 z-20 flex h-[15px] min-w-[15px] items-center justify-center bg-white px-1 font-mono text-[10px] font-semibold text-black ring-2 ring-[#0b0b0c]">
              {badgeCount}
            </div>
          )}
          <PopoverMenu
            mode="default"
            buttonClassName="h-8 w-8 !p-0 relative bg-transparent hover:bg-white/10 border border-white/15 hover:border-white/30 text-white/80 rounded-[3px] shadow-none"
            panelClassName="w-[400px] p-2 bg-[#101014] border border-white/15 mt-2 rounded-[3px]"
            position="bottom"
            align="end"
            triggerIcon={
              inProgressCount > 0 ? (
                <LoaderCircleIcon className="animate-spin text-[11px]" />
              ) : (
                <ListChecksIcon className="text-[11px]" />
              )
            }
            onOpenChange={handleOpenChange}
          >
            {(close) => (
              <>
                <div className="flex max-h-[80vh] flex-col">
                  <div className="max-h-[80vh] overflow-y-auto p-1">
                    {hasNothing ? (
                      <div className="flex w-full flex-col items-center justify-center p-5 text-base-fg/60">
                        <div className="flex items-center gap-2.5 text-sm opacity-60">
                          <ListChecksIcon /> No tasks yet
                        </div>
                      </div>
                    ) : (
                      <div>
                        {inProgress.length > 0 && (
                          <div className="mb-4">
                            <div className="mb-1 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/50">
                              In Progress
                            </div>
                            {inProgress.map((t) => (
                              <InProgressCard
                                key={t.id}
                                task={t}
                                onDismiss={
                                  t.canDismiss
                                    ? () => dismissTask(t.id)
                                    : undefined
                                }
                              />
                            ))}
                          </div>
                        )}
                        {failed.length > 0 && (
                          <div className="mb-4">
                            <div className="mb-1 flex items-center justify-between px-1">
                              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-red-400/70">
                                Failed
                              </div>
                              <button
                                className="text-xs tracking-wide text-red-400/70 transition-colors hover:text-red-300"
                                onClick={() => handleClearFailed()}
                              >
                                <XIcon
                                  
                                  className="mr-1" />
                                Clear failed
                              </button>
                            </div>
                            {failed.map((t) => (
                              <FailedCard
                                key={t.id}
                                task={t}
                                onDismiss={() => dismissTask(t.id)}
                              />
                            ))}
                          </div>
                        )}
                        {completed.length > 0 && (
                          <div>
                            <div className="mb-1 flex items-center justify-between px-1">
                              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/50">
                                Completed
                              </div>
                              <button
                                className="text-xs tracking-wide text-base-fg/50 transition-colors hover:text-base-fg/100"
                                onClick={() => handleClearCompleted()}
                              >
                                <XIcon
                                  
                                  className="mr-1" />
                                Clear completed
                              </button>
                            </div>
                            {completed.map((t) => (
                              <CompletedCard
                                key={t.id}
                                task={t}
                                onClick={() => {
                                  const firstMediaToken =
                                    t.mediaTokens?.[0] || t.id;
                                  const item: GalleryItem = {
                                    id: firstMediaToken,
                                    label: t.title,
                                    thumbnail: t.thumbnailUrl || null,
                                    fullImage: t.imageUrls?.[0] || null,
                                    createdAt: (
                                      t.completedAt || new Date()
                                    ).toISOString(),
                                    mediaClass: t.mediaFileClass,
                                    batchImageToken: t.batchImageToken,
                                    mediaTokens: t.mediaTokens,
                                    imageUrls: t.imageUrls,
                                  } as GalleryItem;
                                  galleryModalLightboxMediaId.value = item.id;
                                  galleryModalLightboxImage.value = {
                                    ...item,
                                    imageUrls: t.imageUrls,
                                    mediaTokens: t.mediaTokens,
                                    batchImageToken: t.batchImageToken,
                                  } as unknown as GalleryItem;
                                  galleryModalLightboxVisible.value = true;
                                  close();
                                }}
                                onDismiss={() => dismissTask(t.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="pt-3">
                    <div className="flex items-center justify-center">
                      <Button
                        className="grow border-none bg-white/5 text-white/70 hover:bg-white/10"
                        variant="ghost"
                        onClick={() => {
                          setModalOpen(true);
                          close();
                        }}
                      >
                        Show all
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </PopoverMenu>
        </div>
      </Tooltip>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        className="h-[520px] max-w-3xl"
        showClose={false}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-ui-panel-border bg-ui-panel">
            <div className="flex items-center justify-between p-3">
              <h2 className="text-lg font-semibold">Task Queue</h2>
              <div className="flex items-center gap-2">
                <Button
                  className="flex h-9 items-center justify-center bg-green-500/10 px-3 text-green-500 hover:bg-green-500/20"
                  onClick={() => handleClearCompleted()}
                >
                  <BrushIcon  className="mr-1.5" />
                  Clear completed
                </Button>
                <Button
                  className="flex h-9 items-center justify-center bg-orange-500/10 px-3 text-orange-500 hover:bg-orange-500/20"
                  onClick={() => handleClearStale()}
                >
                  <Trash2Icon  className="mr-1.5" />
                  Clear stale
                </Button>
                <Button
                  className="flex h-9 items-center justify-center bg-red-500/10 px-3 text-red-400 hover:bg-red-500/20"
                  onClick={() => handleClearFailed()}
                >
                  <Trash2Icon  className="mr-1.5" />
                  Clear failed
                </Button>
                <Button
                  className="flex h-9 items-center justify-center bg-red-500/10 px-3 text-red-500 hover:bg-red-500/20"
                  onClick={() => handleRemoveAll()}
                >
                  <BombIcon  className="mr-1.5" />
                  Remove all
                </Button>
                <div className="mr-2 h-4 w-[1px] bg-base-fg/10" />
                <CloseButton onClick={() => setModalOpen(false)} />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {hasNothing ? (
              <div className="flex w-full flex-col items-center justify-center p-5 text-base-fg/60">
                <div className="flex items-center gap-2.5 text-sm opacity-60">
                  <ListChecksIcon /> No tasks yet
                </div>
              </div>
            ) : (
              <div>
                {inProgress.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-1 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/50">
                      In Progress
                    </div>
                    {inProgress.map((t) => (
                      <InProgressCard
                        key={t.id}
                        task={t}
                        onDismiss={
                          t.canDismiss ? () => dismissTask(t.id) : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                {failed.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-1 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-red-400/70">
                      Failed
                    </div>
                    {failed.map((t) => (
                      <FailedCard
                        key={t.id}
                        task={t}
                        onDismiss={() => dismissTask(t.id)}
                      />
                    ))}
                  </div>
                )}
                {completed.length > 0 && (
                  <div>
                    <div className="mb-1 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/50">
                      Completed
                    </div>
                    {completed.map((t) => (
                      <CompletedCard
                        key={t.id}
                        task={t}
                        onClick={() => {
                          const item: GalleryItem = {
                            id: t.id,
                            label: t.title,
                            thumbnail: t.thumbnailUrl || null,
                            fullImage: t.imageUrls?.[0] || null,
                            createdAt: (
                              t.completedAt || new Date()
                            ).toISOString(),
                            mediaClass: t.mediaFileClass,
                            batchImageToken: t.batchImageToken,
                            mediaTokens: t.mediaTokens,
                            imageUrls: t.imageUrls,
                          } as GalleryItem;
                          galleryModalLightboxMediaId.value = item.id;
                          galleryModalLightboxImage.value = item as GalleryItem;
                          galleryModalLightboxVisible.value = true;
                          setModalOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm clear completed modal */}
      <ActionReminderModal
        isOpen={confirmationConfig.isOpen}
        onClose={() =>
          setConfirmationConfig((prev) => ({ ...prev, isOpen: false }))
        }
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        onPrimaryAction={async () => {
          await confirmationConfig.onConfirm();
          setConfirmationConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        primaryActionText={confirmationConfig.primaryActionText}
        secondaryActionText="Cancel"
        primaryActionIcon={confirmationConfig.primaryActionIcon}
        primaryActionBtnClassName={confirmationConfig.primaryActionBtnClassName}
      />
    </>
  );
};


export default TaskQueue;

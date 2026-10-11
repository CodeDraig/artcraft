import { useEditor } from "../../editor/use-editor";
import { useAssetsPanelStore } from "../../panels/assets/assets-panel-store";
import { useElementPreview } from "../hooks/use-element-preview";
import { useKeyframeDrag } from "../hooks/element/use-keyframe-drag";
import { useKeyframeBoxSelect } from "../hooks/element/use-keyframe-box-select";
import { getElementKeyframes } from "../../animation";
import { canElementHaveAudio, canElementBeHidden, hasMediaId } from "../element-utils";
import { timelineTimeToPixels, timelineTimeToSnappedPixels } from "../pixel-utils";
import { getTrackHeight } from "./track-layout";
import { getTimelineElementClassName } from "./theme";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "../../components/ui/context-menu";
import type { TimelineElement as TimelineElementType, TimelineTrack, ElementDragView } from "../types";
import type { MediaAsset } from "../../media/types";
import { mediaSupportsAudio } from "../../media/media-utils";
import { canToggleSourceAudio, getSourceAudioActionLabel, isSourceAudioSeparated } from "../audio-separation";
import { isElementMuted } from "../audio-state";
import { getTimelinePixelsPerSecond } from "../pixel-utils";
import { addMediaTime } from "../../wasm";
import { invokeAction } from "../../actions";
import { useElementSelection } from "../hooks/element/use-element-selection";
import { ScissorIcon, Copy01Icon, Search01Icon, Exchange01Icon, KeyframeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import { cn } from "../../utils/ui";
import { getTrackTypeForElementType } from "../placement/compatibility";
import { useTimelineStore } from "../timeline-store";
import { getExpandedRows, getExpansionHeight } from "./expanded-layout";
import { PixelsPerSecondContext, ElementContent } from "./ElementContent";
import { getKeyframeIndicators, KeyframeIndicators } from "./KeyframeIndicators";
import { ExpandedKeyframeLanes } from "./ExpandedKeyframeLanes";
import { CopyMenuItem, MuteMenuItem, VisibilityMenuItem, DeleteMenuItem, ActionMenuItem } from "./ElementActionMenuItems";

const ELEMENT_RING_WIDTH_PX = 1.5;


interface TimelineElementProps {
  element: TimelineElementType;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onResizeStart: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
    track: TimelineTrack;
    side: "left" | "right";
  }) => void;
  onElementMouseDown: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
  }) => void;
  onElementClick: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
  }) => void;
  dragView: ElementDragView;
  isDropTarget?: boolean;
}


export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onResizeStart,
  onElementMouseDown,
  onElementClick,
  dragView,
  isDropTarget = false,
}: TimelineElementProps) {
  const mediaAssets = useEditor((e) => e.media.getAssets());
  const { selectedElements } = useElementSelection();
  const requestRevealMedia = useAssetsPanelStore((s) => s.requestRevealMedia);
  const { renderElement } = useElementPreview({
    trackId: track.id,
    elementId: element.id,
    fallback: element,
  });

  let mediaAsset: MediaAsset | null = null;

  if (hasMediaId(element)) {
    mediaAsset =
      mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
  }

  const hasAudio = mediaSupportsAudio({ media: mediaAsset });

  const isCurrentElementSelected = selectedElements.some(
    (selected) =>
      selected.elementId === element.id && selected.trackId === track.id,
  );

  const isDragging = dragView.kind === "dragging";
  const dragTimeOffset = isDragging
    ? dragView.memberTimeOffsets.get(element.id)
    : undefined;
  const isBeingDragged = dragTimeOffset !== undefined;
  const dragOffsetY =
    isDragging && isBeingDragged
      ? dragView.currentMouseY - dragView.startMouseY
      : 0;
  const elementStartTime =
    isDragging && isBeingDragged
      ? addMediaTime({ a: dragView.currentTime, b: dragTimeOffset })
      : renderElement.startTime;
  const displayedStartTime = elementStartTime;
  const displayedDuration = renderElement.duration;
  const elementWidth = timelineTimeToPixels({
    time: displayedDuration,
    zoomLevel,
  });
  const timelinePixelsPerSecond = getTimelinePixelsPerSecond({ zoomLevel });
  const elementLeft = timelineTimeToSnappedPixels({
    time: displayedStartTime,
    zoomLevel,
  });
  const keyframeIndicators = isSelected
    ? getKeyframeIndicators({
        keyframes: getElementKeyframes({ animations: element.animations }),
        trackId: track.id,
        elementId: element.id,
        displayedStartTime,
        zoomLevel,
        elementLeft,
        elementWidth,
      })
    : [];

  const {
    keyframeDragState,
    handleKeyframeMouseDown,
    handleKeyframeClick,
    getVisualOffsetPx,
  } = useKeyframeDrag({ zoomLevel, element, displayedStartTime });

  const elementKeyframes = getElementKeyframes({
    animations: element.animations,
  });

  const isExpanded = useTimelineStore((s) =>
    s.expandedElementIds.has(element.id),
  );
  const toggleElementExpanded = useTimelineStore(
    (s) => s.toggleElementExpanded,
  );
  const expandedRows = useMemo(
    () =>
      isExpanded ? getExpandedRows({ animations: element.animations }) : [],
    [isExpanded, element.animations],
  );

  const {
    containerRef: expandedLanesRef,
    selectionBox: keyframeSelectionBox,
    isBoxSelecting: isKeyframeBoxSelecting,
    handleExpandedAreaMouseDown,
    handleExpandedAreaClick,
  } = useKeyframeBoxSelect({
    trackId: track.id,
    elementId: element.id,
    rows: expandedRows,
    keyframes: elementKeyframes,
    displayedStartTime,
    zoomLevel,
    elementLeft,
  });

  const handleRevealInMedia = ({ event }: { event: React.MouseEvent }) => {
    event.stopPropagation();
    if (hasMediaId(element)) {
      requestRevealMedia(element.mediaId);
    }
  };

  const isMuted = canElementHaveAudio(element) && isElementMuted({ element });
  const canToggleCurrentSourceAudio =
    selectedElements.length === 1 &&
    isCurrentElementSelected &&
    canToggleSourceAudio(element, mediaAsset);
  const sourceAudioLabel =
    element.type === "video"
      ? getSourceAudioActionLabel({ element })
      : "Extract audio";
  const isElementSourceAudioSeparated =
    element.type === "video" && isSourceAudioSeparated({ element });
  const hasKeyframes = elementKeyframes.length > 0;
  const expansionHeight = getExpansionHeight({ rows: expandedRows });
  const baseTrackHeight = getTrackHeight({ type: track.type });

  const expandedContent =
    isExpanded && expandedRows.length > 0 ? (
      <ExpandedKeyframeLanes
        rows={expandedRows}
        keyframes={elementKeyframes}
        trackId={track.id}
        elementId={element.id}
        displayedStartTime={displayedStartTime}
        zoomLevel={zoomLevel}
        elementLeft={elementLeft}
        keyframeDragState={keyframeDragState}
        onKeyframeMouseDown={handleKeyframeMouseDown}
        onKeyframeClick={handleKeyframeClick}
        getVisualOffsetPx={getVisualOffsetPx}
        containerRef={expandedLanesRef}
        onLaneMouseDown={handleExpandedAreaMouseDown}
        onLaneClick={handleExpandedAreaClick}
        selectionBox={keyframeSelectionBox}
        isBoxSelecting={isKeyframeBoxSelecting}
      />
    ) : null;

  return (
    <PixelsPerSecondContext.Provider value={timelinePixelsPerSecond}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="absolute top-0 select-none"
            style={{
              left: `${elementLeft}px`,
              width: `${elementWidth}px`,
              height:
                expandedRows.length > 0
                  ? `${baseTrackHeight + expansionHeight}px`
                  : "100%",
              transform:
                isDragging && isBeingDragged
                  ? `translate3d(0, ${dragOffsetY}px, 0)`
                  : undefined,
            }}
          >
            <ElementInner
              element={element}
              displayElement={renderElement}
              track={track}
              isSelected={isSelected}
              isExpanded={expandedRows.length > 0}
              baseTrackHeight={baseTrackHeight}
              expandedContent={expandedContent}
              onElementClick={onElementClick}
              onElementMouseDown={onElementMouseDown}
              onResizeStart={onResizeStart}
              isDropTarget={isDropTarget}
            />
            {isSelected && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
                style={{ height: `${baseTrackHeight}px` }}
              >
                <KeyframeIndicators
                  indicators={keyframeIndicators}
                  dragState={keyframeDragState}
                  displayedStartTime={displayedStartTime}
                  elementLeft={elementLeft}
                  onKeyframeMouseDown={handleKeyframeMouseDown}
                  onKeyframeClick={handleKeyframeClick}
                  getVisualOffsetPx={getVisualOffsetPx}
                />
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ActionMenuItem
            action="split"
            icon={<HugeiconsIcon icon={ScissorIcon} />}
          >
            Split
          </ActionMenuItem>
          <CopyMenuItem />
          {selectedElements.length === 1 && (
            <ActionMenuItem
              action="duplicate-selected"
              icon={<HugeiconsIcon icon={Copy01Icon} />}
            >
              Duplicate
            </ActionMenuItem>
          )}
          {canElementHaveAudio(element) && hasAudio && (
            <MuteMenuItem
              isMultipleSelected={selectedElements.length > 1}
              isCurrentElementSelected={isCurrentElementSelected}
              isMuted={isMuted}
            />
          )}
          {canToggleCurrentSourceAudio && (
            <ContextMenuItem
              icon={
                <HugeiconsIcon
                  icon={
                    isElementSourceAudioSeparated ? ScissorIcon : ScissorIcon
                  }
                />
              }
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                invokeAction("toggle-source-audio");
              }}
            >
              {sourceAudioLabel}
            </ContextMenuItem>
          )}
          {canElementBeHidden(element) && (
            <VisibilityMenuItem
              element={element}
              isMultipleSelected={selectedElements.length > 1}
              isCurrentElementSelected={isCurrentElementSelected}
            />
          )}
          {hasKeyframes && (
            <ContextMenuItem
              icon={<HugeiconsIcon icon={KeyframeIcon} />}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                toggleElementExpanded(element.id);
              }}
            >
              {isExpanded ? "Collapse keyframes" : "Expand keyframes"}
            </ContextMenuItem>
          )}
          {selectedElements.length === 1 && hasMediaId(element) && (
            <>
              <ContextMenuItem
                icon={<HugeiconsIcon icon={Search01Icon} />}
                onClick={(event: React.MouseEvent) =>
                  handleRevealInMedia({ event })
                }
              >
                Reveal media
              </ContextMenuItem>
              <ContextMenuItem
                icon={<HugeiconsIcon icon={Exchange01Icon} />}
                disabled
              >
                Replace media
              </ContextMenuItem>
            </>
          )}
          <ContextMenuSeparator />
          <DeleteMenuItem
            isMultipleSelected={selectedElements.length > 1}
            isCurrentElementSelected={isCurrentElementSelected}
            elementType={element.type}
            selectedCount={selectedElements.length}
          />
        </ContextMenuContent>
      </ContextMenu>
    </PixelsPerSecondContext.Provider>
  );
}


function ElementInner({
  element,
  displayElement,
  track,
  isSelected,
  isExpanded,
  baseTrackHeight,
  expandedContent,
  onElementClick,
  onElementMouseDown,
  onResizeStart,
  isDropTarget = false,
}: {
  element: TimelineElementType;
  displayElement?: TimelineElementType;
  track: TimelineTrack;
  isSelected: boolean;
  isExpanded: boolean;
  baseTrackHeight: number;
  expandedContent: React.ReactNode;
  onElementClick: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
  }) => void;
  onElementMouseDown: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
  }) => void;
  onResizeStart: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
    track: TimelineTrack;
    side: "left" | "right";
  }) => void;
  isDropTarget?: boolean;
}) {
  const visibleElement = displayElement ?? element;
  const isReducedOpacity =
    (canElementBeHidden(visibleElement) && visibleElement.hidden) ||
    isDropTarget;
  return (
    <div
      className="absolute top-0 bottom-0"
      style={{
        left: `${ELEMENT_RING_WIDTH_PX}px`,
        right: `${ELEMENT_RING_WIDTH_PX}px`,
      }}
    >
      <div
        className="absolute inset-0 rounded-sm"
        style={
          isSelected
            ? {
                boxShadow: `0 0 0 ${ELEMENT_RING_WIDTH_PX}px var(--primary)`,
              }
            : undefined
        }
      >
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-sm",
            isExpanded && "bg-background",
          )}
        >
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-0 size-full flex flex-col"
            onClick={(event) => onElementClick({ event, element })}
            onMouseDown={(event) => onElementMouseDown({ event, element })}
          >
            <div
              className={cn(
                "flex shrink-0 items-center overflow-hidden",
                getTimelineElementClassName({
                  type: getTrackTypeForElementType({
                    elementType: element.type,
                  }),
                }),
                isReducedOpacity && "opacity-50",
              )}
              style={{ height: `${baseTrackHeight}px` }}
            >
              <div className="flex flex-1 min-h-0 h-full items-center overflow-hidden">
                <ElementContent element={visibleElement} track={track} />
              </div>
            </div>
            {expandedContent}
          </button>
        </div>
      </div>

      {isSelected && (
        <>
          <ResizeHandle
            side="left"
            element={element}
            track={track}
            onResizeStart={onResizeStart}
          />
          <ResizeHandle
            side="right"
            element={element}
            track={track}
            onResizeStart={onResizeStart}
          />
        </>
      )}
    </div>
  );
}


function ResizeHandle({
  side,
  element,
  track,
  onResizeStart,
}: {
  side: "left" | "right";
  element: TimelineElementType;
  track: TimelineTrack;
  onResizeStart: (params: {
    event: React.MouseEvent;
    element: TimelineElementType;
    track: TimelineTrack;
    side: "left" | "right";
  }) => void;
}) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      className={cn(
        "absolute top-0 bottom-0 w-2",
        isLeft ? "-left-1 cursor-w-resize" : "-right-1 cursor-e-resize",
      )}
      onMouseDown={(event) => onResizeStart({ event, element, track, side })}
      onClick={(event) => event.stopPropagation()}
      aria-label={`${isLeft ? "Left" : "Right"} resize handle`}
    ></button>
  );
}

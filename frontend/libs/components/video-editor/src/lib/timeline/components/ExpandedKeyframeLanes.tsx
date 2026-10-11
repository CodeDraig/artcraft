import { type KeyframeDragState } from "../hooks/element/use-keyframe-drag";
import { useKeyframeSelection } from "../hooks/element/use-keyframe-selection";
import { SelectionBox } from "../../selection/selection-box";
import { timelineTimeToSnappedPixels } from "../pixel-utils";
import type { SelectionBoxBounds } from "../../selection/types";
import { type MediaTime } from "../../wasm";
import { KeyframeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import type {
  SelectedKeyframeRef,
  ElementKeyframe,
} from "../../animation/types";
import { cn } from "../../utils/ui";
import { KEYFRAME_LANE_HEIGHT_PX } from "./layout";
import { type ExpandedRow } from "./expanded-layout";

export function ExpandedKeyframeLanes({
  rows,
  keyframes,
  trackId,
  elementId,
  displayedStartTime,
  zoomLevel,
  elementLeft,
  keyframeDragState,
  onKeyframeMouseDown,
  onKeyframeClick,
  getVisualOffsetPx,
  containerRef,
  onLaneMouseDown,
  onLaneClick,
  selectionBox,
  isBoxSelecting,
}: {
  rows: ExpandedRow[];
  keyframes: ElementKeyframe[];
  trackId: string;
  elementId: string;
  displayedStartTime: MediaTime;
  zoomLevel: number;
  elementLeft: number;
  keyframeDragState: KeyframeDragState;
  onKeyframeMouseDown: (params: {
    event: React.MouseEvent;
    keyframes: SelectedKeyframeRef[];
  }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onLaneMouseDown: (event: React.MouseEvent) => void;
  onLaneClick: (event: React.MouseEvent) => void;
  selectionBox: {
    bounds: SelectionBoxBounds;
  } | null;
  isBoxSelecting: boolean;
  onKeyframeClick: (params: {
    event: React.MouseEvent;
    keyframes: SelectedKeyframeRef[];
    orderedKeyframes: SelectedKeyframeRef[];
    indicatorTime: MediaTime;
  }) => void;
  getVisualOffsetPx: (params: {
    indicatorTime: MediaTime;
    indicatorOffsetPx: number;
    isBeingDragged: boolean;
    displayedStartTime: MediaTime;
    elementLeft: number;
  }) => number;
}) {
  const { isKeyframeSelected } = useKeyframeSelection();

  const orderedKeyframes = useMemo(
    () =>
      [...keyframes]
        .sort(
          (a, b) =>
            a.time - b.time || a.propertyPath.localeCompare(b.propertyPath),
        )
        .map((kf) => ({
          trackId,
          elementId,
          propertyPath: kf.propertyPath,
          keyframeId: kf.id,
        })),
    [keyframes, trackId, elementId],
  );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- spatial gesture surface (keyframe lanes); keyboard control over keyframes is via global timeline shortcuts, not per-element focus.
    <div
      ref={containerRef}
      className="relative flex flex-col"
      onMouseDown={onLaneMouseDown}
      onClick={onLaneClick}
    >
      {rows.map((row) => {
        const laneKeyframes = keyframes.filter(
          (kf) => kf.propertyPath === row.propertyPath,
        );
        return (
          <div
            key={row.propertyPath}
            className={cn("relative flex items-center bg-muted/50")}
            style={{ height: `${KEYFRAME_LANE_HEIGHT_PX}px` }}
          >
            {laneKeyframes.map((kf) => {
              const keyframeRef: SelectedKeyframeRef = {
                trackId,
                elementId,
                propertyPath: row.propertyPath,
                keyframeId: kf.id,
              };
              const isBeingDragged = keyframeDragState.draggingKeyframeIds.has(
                kf.id,
              );
              const kfLeft = timelineTimeToSnappedPixels({
                time: displayedStartTime + kf.time,
                zoomLevel,
              });
              const offsetPx = kfLeft - elementLeft;
              const visualOffset = getVisualOffsetPx({
                indicatorTime: kf.time,
                indicatorOffsetPx: offsetPx,
                isBeingDragged,
                displayedStartTime,
                elementLeft,
              });
              const isSelected = isKeyframeSelected({
                keyframe: keyframeRef,
              });

              return (
                <button
                  key={kf.id}
                  type="button"
                  className={cn(
                    "pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab",
                    isBoxSelecting && "pointer-events-none",
                  )}
                  style={{ left: visualOffset }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    onKeyframeMouseDown({
                      event,
                      keyframes: [keyframeRef],
                    });
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onKeyframeClick({
                      event,
                      keyframes: [keyframeRef],
                      orderedKeyframes,
                      indicatorTime: kf.time,
                    });
                  }}
                  aria-label="Select keyframe"
                >
                  <HugeiconsIcon
                    icon={KeyframeIcon}
                    className={cn(
                      "size-3.5 text-black mr-1",
                      isSelected ? "fill-primary" : "fill-white",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>
        );
      })}
      {selectionBox && <SelectionBox bounds={selectionBox.bounds} />}
    </div>
  );
}

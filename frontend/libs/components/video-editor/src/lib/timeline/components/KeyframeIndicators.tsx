import { type KeyframeDragState } from "../hooks/element/use-keyframe-drag";
import { useKeyframeSelection } from "../hooks/element/use-keyframe-selection";
import { timelineTimeToSnappedPixels } from "../pixel-utils";
import { type MediaTime } from "../../wasm";
import { KeyframeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  SelectedKeyframeRef,
  ElementKeyframe,
} from "../../animation/types";
import { cn } from "../../utils/ui";

const KEYFRAME_INDICATOR_MIN_WIDTH_PX = 40;

interface KeyframeIndicator {
  time: MediaTime;
  offsetPx: number;
  keyframes: SelectedKeyframeRef[];
}

export function buildKeyframeIndicator({
  keyframe,
  trackId,
  elementId,
  displayedStartTime,
  zoomLevel,
  elementLeft,
}: {
  keyframe: ElementKeyframe;
  trackId: string;
  elementId: string;
  displayedStartTime: MediaTime;
  zoomLevel: number;
  elementLeft: number;
}): {
  time: MediaTime;
  offsetPx: number;
  keyframeRef: SelectedKeyframeRef;
} {
  const keyframeRef = {
    trackId,
    elementId,
    propertyPath: keyframe.propertyPath,
    keyframeId: keyframe.id,
  };
  const keyframeLeft = timelineTimeToSnappedPixels({
    time: displayedStartTime + keyframe.time,
    zoomLevel,
  });
  return {
    time: keyframe.time,
    offsetPx: keyframeLeft - elementLeft,
    keyframeRef,
  };
}

export function getKeyframeIndicators({
  keyframes,
  trackId,
  elementId,
  displayedStartTime,
  zoomLevel,
  elementLeft,
  elementWidth,
}: {
  keyframes: ElementKeyframe[];
  trackId: string;
  elementId: string;
  displayedStartTime: MediaTime;
  zoomLevel: number;
  elementLeft: number;
  elementWidth: number;
}): KeyframeIndicator[] {
  if (elementWidth < KEYFRAME_INDICATOR_MIN_WIDTH_PX) {
    return [];
  }

  const keyframesByTime = new Map<MediaTime, KeyframeIndicator>();
  for (const keyframe of keyframes) {
    const indicator = buildKeyframeIndicator({
      keyframe,
      trackId,
      elementId,
      displayedStartTime,
      zoomLevel,
      elementLeft,
    });
    const existingIndicator = keyframesByTime.get(indicator.time);
    if (!existingIndicator) {
      keyframesByTime.set(indicator.time, {
        time: indicator.time,
        offsetPx: indicator.offsetPx,
        keyframes: [indicator.keyframeRef],
      });
      continue;
    }

    existingIndicator.keyframes.push(indicator.keyframeRef);
  }

  return [...keyframesByTime.values()].sort((a, b) => a.time - b.time);
}

export function KeyframeIndicators({
  indicators,
  dragState,
  displayedStartTime,
  elementLeft,
  onKeyframeMouseDown,
  onKeyframeClick,
  getVisualOffsetPx,
}: {
  indicators: KeyframeIndicator[];
  dragState: KeyframeDragState;
  displayedStartTime: MediaTime;
  elementLeft: number;
  onKeyframeMouseDown: (params: {
    event: React.MouseEvent;
    keyframes: SelectedKeyframeRef[];
  }) => void;
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
  const orderedKeyframes = indicators.flatMap(
    (indicator) => indicator.keyframes,
  );

  return indicators.map((indicator) => {
    const isIndicatorSelected = indicator.keyframes.some((keyframe) =>
      isKeyframeSelected({ keyframe }),
    );
    const isBeingDragged = indicator.keyframes.some((keyframe) =>
      dragState.draggingKeyframeIds.has(keyframe.keyframeId),
    );
    const visualOffsetPx = getVisualOffsetPx({
      indicatorTime: indicator.time,
      indicatorOffsetPx: indicator.offsetPx,
      isBeingDragged,
      displayedStartTime,
      elementLeft,
    });

    return (
      <button
        key={indicator.time}
        type="button"
        className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab mr-0.5"
        style={{ left: visualOffsetPx }}
        onMouseDown={(event) =>
          onKeyframeMouseDown({ event, keyframes: indicator.keyframes })
        }
        onClick={(event) =>
          onKeyframeClick({
            event,
            keyframes: indicator.keyframes,
            orderedKeyframes,
            indicatorTime: indicator.time,
          })
        }
        aria-label="Select keyframe"
      >
        <HugeiconsIcon
          icon={KeyframeIcon}
          className={cn(
            "size-3.5 text-black",
            isIndicatorSelected ? "fill-primary" : "fill-white",
          )}
          strokeWidth={1.5}
        />
      </button>
    );
  });
}

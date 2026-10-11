import { createScalarKey } from "./interpolation";
import type {
  AnimationChannel,
  DiscreteAnimationChannel,
  ElementAnimations,
  ScalarAnimationChannel,
} from "./types";
import {
  getDefaultLeftHandle,
  getDefaultRightHandle,
  solveBezierProgressForTime,
} from "./bezier";
import {
  getChannelValueAtTime,
  getScalarSegmentInterpolation,
  isScalarChannel,
  normalizeChannel,
} from "./interpolation";
import {
  type MediaTime,
  roundMediaTime,
  subMediaTime,
  ZERO_MEDIA_TIME,
} from "../wasm";
import { generateUUID } from "../utils/id";
import {
  toAnimation,
  setChannelInData,
  getChannelDataEntries,
} from "./channel-state";

export function clampAnimationsToDuration({
  animations,
  duration,
}: {
  animations: ElementAnimations | undefined;
  duration: MediaTime;
}): ElementAnimations | undefined {
  if (!animations || duration <= 0) {
    return undefined;
  }

  return splitAnimationsAtTime({
    animations,
    splitTime: duration,
    shouldIncludeSplitBoundary: true,
  }).leftAnimations;
}

function lerpPoint({
  left,
  right,
  progress,
}: {
  left: { x: number; y: number };
  right: { x: number; y: number };
  progress: number;
}) {
  return {
    x: left.x + (right.x - left.x) * progress,
    y: left.y + (right.y - left.y) * progress,
  };
}

function splitDiscreteChannelAtTime({
  channel,
  splitTime,
  leftBoundaryId,
  rightBoundaryId,
  shouldIncludeSplitBoundary,
}: {
  channel: DiscreteAnimationChannel | undefined;
  splitTime: MediaTime;
  leftBoundaryId: string;
  rightBoundaryId: string;
  shouldIncludeSplitBoundary: boolean;
}) {
  if (!channel || channel.keys.length === 0) {
    return {
      leftChannel: undefined,
      rightChannel: undefined,
    };
  }

  const normalizedChannel = normalizeChannel({ channel });
  let leftKeys = normalizedChannel.keys.filter((key) => key.time <= splitTime);
  let rightKeys = normalizedChannel.keys
    .filter((key) => key.time >= splitTime)
    .map((key) => ({
      ...key,
      time: subMediaTime({ a: key.time, b: splitTime }),
    }));

  if (shouldIncludeSplitBoundary) {
    const hasBoundaryOnLeft = leftKeys.some((key) => key.time === splitTime);
    const hasBoundaryOnRight = rightKeys.some((key) => key.time === 0);
    const boundaryValue = getChannelValueAtTime({
      channel: normalizedChannel,
      time: splitTime,
      fallbackValue: normalizedChannel.keys[0].value,
    });
    if (!hasBoundaryOnLeft) {
      leftKeys = [
        ...leftKeys,
        {
          id: leftBoundaryId,
          time: splitTime,
          value: boundaryValue,
        },
      ];
    }
    if (!hasBoundaryOnRight) {
      rightKeys = [
        {
          id: rightBoundaryId,
          time: ZERO_MEDIA_TIME,
          value: boundaryValue,
        },
        ...rightKeys,
      ];
    }
  }

  return {
    leftChannel: leftKeys.length
      ? normalizeChannel({ channel: { keys: leftKeys } })
      : undefined,
    rightChannel: rightKeys.length
      ? normalizeChannel({ channel: { keys: rightKeys } })
      : undefined,
  };
}

function splitScalarChannelAtTime({
  channel,
  splitTime,
  leftBoundaryId,
  rightBoundaryId,
  shouldIncludeSplitBoundary,
}: {
  channel: ScalarAnimationChannel | undefined;
  splitTime: MediaTime;
  leftBoundaryId: string;
  rightBoundaryId: string;
  shouldIncludeSplitBoundary: boolean;
}) {
  if (!channel || channel.keys.length === 0) {
    return {
      leftChannel: undefined,
      rightChannel: undefined,
    };
  }

  const normalizedChannel = normalizeChannel({ channel });
  let leftKeys = normalizedChannel.keys.filter((key) => key.time <= splitTime);
  let rightKeys = normalizedChannel.keys
    .filter((key) => key.time >= splitTime)
    .map((key) => ({
      ...key,
      time: subMediaTime({ a: key.time, b: splitTime }),
    }));

  const hasBoundaryOnLeft = leftKeys.some((key) => key.time === splitTime);
  const hasBoundaryOnRight = rightKeys.some((key) => key.time === 0);
  if (
    !shouldIncludeSplitBoundary ||
    (hasBoundaryOnLeft && hasBoundaryOnRight)
  ) {
    return {
      leftChannel: leftKeys.length
        ? normalizeChannel({
            channel: {
              keys: leftKeys,
              extrapolation: normalizedChannel.extrapolation,
            },
          })
        : undefined,
      rightChannel: rightKeys.length
        ? normalizeChannel({
            channel: {
              keys: rightKeys,
              extrapolation: normalizedChannel.extrapolation,
            },
          })
        : undefined,
    };
  }

  // de Casteljau split for the Bezier segment containing splitTime.
  for (
    let keyIndex = 0;
    keyIndex < normalizedChannel.keys.length - 1;
    keyIndex++
  ) {
    const leftKey = normalizedChannel.keys[keyIndex];
    const rightKey = normalizedChannel.keys[keyIndex + 1];
    if (!(splitTime > leftKey.time && splitTime < rightKey.time)) {
      continue;
    }

    const boundaryValue = getChannelValueAtTime({
      channel: normalizedChannel,
      time: splitTime,
      fallbackValue: leftKey.value,
    });

    if (leftKey.segmentToNext === "bezier") {
      const rightHandle =
        leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
      const leftHandle =
        rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });
      const progress = solveBezierProgressForTime({
        time: splitTime,
        leftKey,
        rightKey,
      });
      const p0 = { x: leftKey.time, y: leftKey.value };
      const p1 = {
        x: leftKey.time + rightHandle.dt,
        y: leftKey.value + rightHandle.dv,
      };
      const p2 = {
        x: rightKey.time + leftHandle.dt,
        y: rightKey.value + leftHandle.dv,
      };
      const p3 = { x: rightKey.time, y: rightKey.value };
      const q0 = lerpPoint({ left: p0, right: p1, progress });
      const q1 = lerpPoint({ left: p1, right: p2, progress });
      const q2 = lerpPoint({ left: p2, right: p3, progress });
      const r0 = lerpPoint({ left: q0, right: q1, progress });
      const r1 = lerpPoint({ left: q1, right: q2, progress });
      const splitPoint = lerpPoint({ left: r0, right: r1, progress });
      leftKeys = [
        ...normalizedChannel.keys.filter((key) => key.time < splitTime),
        {
          ...leftKey,
          rightHandle: {
            dt: roundMediaTime({ time: q0.x - p0.x }),
            dv: q0.y - p0.y,
          },
        },
        {
          id: leftBoundaryId,
          time: splitTime,
          value: boundaryValue,
          leftHandle: {
            dt: roundMediaTime({ time: r0.x - splitPoint.x }),
            dv: r0.y - splitPoint.y,
          },
          segmentToNext: leftKey.segmentToNext,
          tangentMode: leftKey.tangentMode,
        },
      ];
      rightKeys = [
        {
          id: rightBoundaryId,
          time: ZERO_MEDIA_TIME,
          value: boundaryValue,
          rightHandle: {
            dt: roundMediaTime({ time: r1.x - splitPoint.x }),
            dv: r1.y - splitPoint.y,
          },
          segmentToNext: "bezier",
          tangentMode: leftKey.tangentMode,
        },
        {
          ...rightKey,
          time: subMediaTime({ a: rightKey.time, b: splitTime }),
          leftHandle: {
            dt: roundMediaTime({ time: q2.x - p3.x }),
            dv: q2.y - p3.y,
          },
        },
        ...normalizedChannel.keys
          .filter((key) => key.time > rightKey.time)
          .map((key) => ({
            ...key,
            time: subMediaTime({ a: key.time, b: splitTime }),
          })),
      ];
    } else {
      leftKeys = [
        ...leftKeys,
        createScalarKey({
          id: leftBoundaryId,
          time: splitTime,
          value: boundaryValue,
          interpolation: "linear",
        }),
      ];
      rightKeys = [
        createScalarKey({
          id: rightBoundaryId,
          time: ZERO_MEDIA_TIME,
          value: boundaryValue,
          interpolation: getScalarSegmentInterpolation({
            segment: leftKey.segmentToNext,
          }),
        }),
        ...rightKeys,
      ];
    }

    return {
      leftChannel: normalizeChannel({
        channel: {
          keys: leftKeys,
          extrapolation: normalizedChannel.extrapolation,
        },
      }),
      rightChannel: normalizeChannel({
        channel: {
          keys: rightKeys,
          extrapolation: normalizedChannel.extrapolation,
        },
      }),
    };
  }

  return {
    leftChannel: leftKeys.length
      ? normalizeChannel({
          channel: {
            keys: leftKeys,
            extrapolation: normalizedChannel.extrapolation,
          },
        })
      : undefined,
    rightChannel: rightKeys.length
      ? normalizeChannel({
          channel: {
            keys: rightKeys,
            extrapolation: normalizedChannel.extrapolation,
          },
        })
      : undefined,
  };
}

function splitChannelAtTime({
  channel,
  splitTime,
  leftBoundaryId,
  rightBoundaryId,
  shouldIncludeSplitBoundary,
}: {
  channel: AnimationChannel | undefined;
  splitTime: MediaTime;
  leftBoundaryId: string;
  rightBoundaryId: string;
  shouldIncludeSplitBoundary: boolean;
}) {
  return channel != null && !isScalarChannel(channel)
    ? splitDiscreteChannelAtTime({
        channel,
        splitTime,
        leftBoundaryId,
        rightBoundaryId,
        shouldIncludeSplitBoundary,
      })
    : splitScalarChannelAtTime({
        channel:
          channel != null && isScalarChannel(channel) ? channel : undefined,
        splitTime,
        leftBoundaryId,
        rightBoundaryId,
        shouldIncludeSplitBoundary,
      });
}

export function splitAnimationsAtTime({
  animations,
  splitTime,
  shouldIncludeSplitBoundary = true,
}: {
  animations: ElementAnimations | undefined;
  splitTime: MediaTime;
  shouldIncludeSplitBoundary?: boolean;
}): {
  leftAnimations: ElementAnimations | undefined;
  rightAnimations: ElementAnimations | undefined;
} {
  if (!animations) {
    return { leftAnimations: undefined, rightAnimations: undefined };
  }

  const leftAnimations: ElementAnimations = {};
  const rightAnimations: ElementAnimations = {};

  for (const [propertyPath, data] of Object.entries(animations)) {
    if (!data) {
      continue;
    }

    const leftBoundaryId = generateUUID();
    const rightBoundaryId = generateUUID();

    for (const [componentKey, channel] of getChannelDataEntries({ data })) {
      const splitResult = splitChannelAtTime({
        channel,
        splitTime,
        leftBoundaryId,
        rightBoundaryId,
        shouldIncludeSplitBoundary,
      });
      if (splitResult.leftChannel) {
        leftAnimations[propertyPath] = setChannelInData({
          data: leftAnimations[propertyPath],
          componentKey,
          channel: splitResult.leftChannel,
        });
      }
      if (splitResult.rightChannel) {
        rightAnimations[propertyPath] = setChannelInData({
          data: rightAnimations[propertyPath],
          componentKey,
          channel: splitResult.rightChannel,
        });
      }
    }
  }

  return {
    leftAnimations: toAnimation({ animations: leftAnimations }),
    rightAnimations: toAnimation({ animations: rightAnimations }),
  };
}

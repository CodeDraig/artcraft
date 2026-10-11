import { createScalarKey, getScalarSegmentType } from "./interpolation";
import type { AnimationChannel, ChannelData, AnimationInterpolation, AnimationPath, DiscreteAnimationChannel, ElementAnimations, ScalarAnimationChannel, ScalarCurveKeyframePatch } from "./types";
import type { ChannelComponentDefinition, ParamChannelLayout, ParamValue } from "../params";
import { getChannelsFromData, isCompositeChannelData, isLeafChannelData } from "./channel-data";
import { isScalarChannel, normalizeChannel, normalizeDiscreteChannel, normalizeScalarChannel } from "./interpolation";
import { type MediaTime } from "../wasm";
import { generateUUID } from "../utils/id";
import { hasChannelKeys, toAnimation, getChannelFromData, setChannelInData } from "./channel-state";

type LayoutComponent = ChannelComponentDefinition<string>;


function getLayoutComponents({
  channelLayout,
}: {
  channelLayout: ParamChannelLayout;
}): LayoutComponent[] {
  return channelLayout.kind === "leaf"
    ? [channelLayout.component]
    : channelLayout.components;
}


function getPrimaryComponentKey({
  channelLayout,
}: {
  channelLayout: ParamChannelLayout;
}): string {
  return getLayoutComponents({ channelLayout })[0]?.key ?? "value";
}


function getPrimaryChannelFromData({
  data,
  channelLayout,
}: {
  data: ChannelData | undefined;
  channelLayout: ParamChannelLayout;
}): AnimationChannel | undefined {
  return getChannelFromData({
    data,
    componentKey: getPrimaryComponentKey({ channelLayout }),
  });
}


function getInterpolationForComponent({
  component,
  interpolation,
}: {
  component: LayoutComponent;
  interpolation: AnimationInterpolation | undefined;
}): AnimationInterpolation {
  if (component.valueKind === "discrete") {
    return "hold";
  }

  if (
    interpolation === "linear" ||
    interpolation === "hold" ||
    interpolation === "bezier"
  ) {
    return interpolation;
  }

  return component.defaultInterpolation;
}


function decomposeChannelLayoutValue({
  channelLayout,
  value,
}: {
  channelLayout: ParamChannelLayout;
  value: ParamValue;
}): Record<string, ParamValue> | null {
  if (channelLayout.kind === "leaf") {
    return { [channelLayout.component.key]: value };
  }
  if (typeof value !== "string") {
    return null;
  }

  const components = channelLayout.decompose(value);
  return components ? { ...components } : null;
}


function isDiscreteChannel(
  channel: AnimationChannel | undefined,
): channel is DiscreteAnimationChannel {
  return channel != null && !isScalarChannel(channel);
}


function getChannelData({
  animations,
  propertyPath,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
}): ChannelData | undefined {
  return animations?.[propertyPath];
}


function getTargetKeyMetadata({
  channel,
  time,
  keyframeId,
}: {
  channel: AnimationChannel | undefined;
  time: MediaTime;
  keyframeId?: string;
}) {
  const normalizedChannel =
    channel != null ? normalizeChannel({ channel }) : undefined;
  const keys = normalizedChannel?.keys ?? [];
  if (keyframeId) {
    const keyById = keys.find((key) => key.id === keyframeId);
    if (keyById) {
      return {
        id: keyById.id,
        time,
      };
    }
  }

  const keyAtTime = keys.find((key) =>
    key.time === time,
  );
  if (keyAtTime) {
    return {
      id: keyAtTime.id,
      time: keyAtTime.time,
    };
  }

  return {
    id: keyframeId ?? generateUUID(),
    time,
  };
}


function upsertDiscreteChannelKey({
  channel,
  time,
  value,
  keyframeId,
}: {
  channel: DiscreteAnimationChannel | undefined;
  time: MediaTime;
  value: string | boolean;
  keyframeId?: string;
}): DiscreteAnimationChannel {
  const normalizedChannel = normalizeDiscreteChannel({
    channel: channel ?? { keys: [] },
  });
  const keys = [...normalizedChannel.keys];
  if (keyframeId) {
    const existingIndex = keys.findIndex((key) => key.id === keyframeId);
    if (existingIndex >= 0) {
      keys[existingIndex] = ({
        id: keys[existingIndex].id,
        time,
        value,
      });
      return normalizeDiscreteChannel({
        channel: { keys },
      });
    }
  }

  const existingAtTimeIndex = keys.findIndex((key) =>
    key.time === time,
  );
  if (existingAtTimeIndex >= 0) {
    keys[existingAtTimeIndex] = ({
      id: keys[existingAtTimeIndex].id,
      time: keys[existingAtTimeIndex].time,
      value,
    });
    return normalizeDiscreteChannel({
      channel: { keys },
    });
  }

  keys.push(
    ({
      id: keyframeId ?? generateUUID(),
      time,
      value,
    }),
  );
  return normalizeDiscreteChannel({
    channel: { keys },
  });
}


function upsertScalarChannelKey({
  channel,
  time,
  value,
  interpolation,
  defaultInterpolation,
  keyframeId,
}: {
  channel: ScalarAnimationChannel | undefined;
  time: MediaTime;
  value: number;
  interpolation?: AnimationInterpolation;
  defaultInterpolation?: AnimationInterpolation;
  keyframeId?: string;
}): ScalarAnimationChannel {
  const normalizedChannel = normalizeScalarChannel({
    channel: channel ?? { keys: [] },
  });
  const keys = [...normalizedChannel.keys];
  if (keyframeId) {
    const existingIndex = keys.findIndex((key) => key.id === keyframeId);
    if (existingIndex >= 0) {
      keys[existingIndex] = createScalarKey({
        id: keys[existingIndex].id,
        time,
        value,
        interpolation,
        previousKey:
          interpolation != null
            ? {
                ...keys[existingIndex],
                segmentToNext: getScalarSegmentType({ interpolation }),
              }
            : keys[existingIndex],
      });
      return normalizeScalarChannel({
        channel: {
          keys,
          extrapolation: normalizedChannel.extrapolation,
        },
      });
    }
  }

  const existingAtTimeIndex = keys.findIndex((key) =>
    key.time === time,
  );
  if (existingAtTimeIndex >= 0) {
    keys[existingAtTimeIndex] = createScalarKey({
      id: keys[existingAtTimeIndex].id,
      time: keys[existingAtTimeIndex].time,
      value,
      interpolation,
      previousKey:
        interpolation != null
          ? {
              ...keys[existingAtTimeIndex],
              segmentToNext: getScalarSegmentType({ interpolation }),
            }
          : keys[existingAtTimeIndex],
    });
    return normalizeScalarChannel({
      channel: {
        keys,
        extrapolation: normalizedChannel.extrapolation,
      },
    });
  }

  keys.push(
    createScalarKey({
      id: keyframeId ?? generateUUID(),
      time,
      value,
      interpolation: interpolation ?? defaultInterpolation,
    }),
  );
  return normalizeScalarChannel({
    channel: {
      keys,
      extrapolation: normalizedChannel.extrapolation,
    },
  });
}


export function getChannel({
  animations,
  propertyPath,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
}): AnimationChannel | undefined {
  const data = getChannelData({ animations, propertyPath });
  if (isLeafChannelData(data)) {
    return data;
  }
  return getChannelsFromData({ data })[0];
}


export function upsertPathKeyframe({
  animations,
  propertyPath,
  time,
  value,
  interpolation,
  keyframeId,
  channelLayout,
  coerceValue,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
  time: MediaTime;
  value: ParamValue;
  interpolation?: AnimationInterpolation;
  keyframeId?: string;
  channelLayout: ParamChannelLayout;
  coerceValue: ({ value }: { value: ParamValue }) => ParamValue | null;
}): ElementAnimations | undefined {
  const coercedValue = coerceValue({ value });
  if (coercedValue === null) {
    return animations;
  }

  const nextAnimations: ElementAnimations = { ...(animations ?? {}) };
  const currentData = getChannelData({ animations, propertyPath });
  const primaryChannel = getPrimaryChannelFromData({
    data: currentData,
    channelLayout,
  });
  const targetKey = getTargetKeyMetadata({
    channel: primaryChannel,
    time,
    keyframeId,
  });
  const componentValues = decomposeChannelLayoutValue({
    channelLayout,
    value: coercedValue,
  });
  if (!componentValues) {
    return animations;
  }

  let nextData: ChannelData | undefined = currentData;
  for (const component of getLayoutComponents({ channelLayout })) {
    const componentKey = component.key;
    const nextValue = componentValues[componentKey];
    if (nextValue == null) {
      continue;
    }

    const currentChannel = getChannelFromData({
      data: currentData,
      componentKey,
    });
    if (component.valueKind === "discrete") {
      if (typeof nextValue !== "string" && typeof nextValue !== "boolean") {
        continue;
      }
      const nextChannel = upsertDiscreteChannelKey({
        channel: isDiscreteChannel(currentChannel) ? currentChannel : undefined,
        time: targetKey.time,
        value: nextValue,
        keyframeId: targetKey.id,
      });
      nextData = setChannelInData({
        data: nextData,
        componentKey,
        channel: nextChannel,
      });
      continue;
    }

    if (typeof nextValue !== "number") {
      continue;
    }
    const nextChannel = upsertScalarChannelKey({
      channel:
        currentChannel != null && isScalarChannel(currentChannel)
          ? currentChannel
          : undefined,
      time: targetKey.time,
      value: nextValue,
      interpolation:
        interpolation != null
          ? getInterpolationForComponent({ component, interpolation })
          : undefined,
      defaultInterpolation: component.defaultInterpolation,
      keyframeId: targetKey.id,
    });
    nextData = setChannelInData({
      data: nextData,
      componentKey,
      channel: nextChannel,
    });
  }
  nextAnimations[propertyPath] = nextData;

  return toAnimation({
    animations: nextAnimations,
  });
}


export function removeKeyframe({
  channel,
  keyframeId,
}: {
  channel: AnimationChannel | undefined;
  keyframeId: string;
}): AnimationChannel | undefined {
  if (!channel) {
    return undefined;
  }

  if (isScalarChannel(channel)) {
    const nextKeys = channel.keys.filter((keyframe) => keyframe.id !== keyframeId);
    if (nextKeys.length === 0) {
      return undefined;
    }

    return normalizeScalarChannel({
      channel: {
        ...channel,
        keys: nextKeys,
      },
    });
  }

  const nextKeys = channel.keys.filter((keyframe) => keyframe.id !== keyframeId);
  if (nextKeys.length === 0) {
    return undefined;
  }

  return normalizeDiscreteChannel({
    channel: {
      ...channel,
      keys: nextKeys,
    },
  });
}


export function retimeKeyframe({
  channel,
  keyframeId,
  time,
}: {
  channel: AnimationChannel | undefined;
  keyframeId: string;
  time: MediaTime;
}): AnimationChannel | undefined {
  if (!channel) {
    return undefined;
  }

  if (isScalarChannel(channel)) {
    const keyframeByIdIndex = channel.keys.findIndex(
      (keyframe) => keyframe.id === keyframeId,
    );
    if (keyframeByIdIndex < 0) {
      return channel;
    }

    const nextKeys = [...channel.keys];
    nextKeys[keyframeByIdIndex] = {
      ...nextKeys[keyframeByIdIndex],
      time,
    };

    return normalizeScalarChannel({
      channel: {
        ...channel,
        keys: nextKeys,
      },
    });
  }

  const keyframeByIdIndex = channel.keys.findIndex(
    (keyframe) => keyframe.id === keyframeId,
  );
  if (keyframeByIdIndex < 0) {
    return channel;
  }

  const nextKeys = [...channel.keys];
  nextKeys[keyframeByIdIndex] = {
    ...nextKeys[keyframeByIdIndex],
    time,
  };

  return normalizeDiscreteChannel({
    channel: {
      ...channel,
      keys: nextKeys,
    },
  });
}


export function setChannel({
  animations,
  propertyPath,
  channel,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
  channel: AnimationChannel | undefined;
}): ElementAnimations | undefined {
  return setBindingComponentChannel({
    animations,
    propertyPath,
    componentKey: "value",
    channel,
  });
}


export function setBindingComponentChannel({
  animations,
  propertyPath,
  componentKey,
  channel,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
  componentKey: string;
  channel: AnimationChannel | undefined;
}): ElementAnimations | undefined {
  const nextAnimations: ElementAnimations = { ...(animations ?? {}) };
  nextAnimations[propertyPath] = setChannelInData({
    data: nextAnimations[propertyPath],
    componentKey,
    channel:
      channel && hasChannelKeys({ channel })
        ? normalizeChannel({ channel })
        : undefined,
  });
  return toAnimation({
    animations: nextAnimations,
  });
}


export function updateScalarKeyframeCurve({
  animations,
  propertyPath,
  componentKey,
  keyframeId,
  patch,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
  componentKey: string;
  keyframeId: string;
  patch: ScalarCurveKeyframePatch;
}): ElementAnimations | undefined {
  const channel = getChannelFromData({
    data: getChannelData({ animations, propertyPath }),
    componentKey,
  });
  if (!channel || !isScalarChannel(channel)) {
    return animations;
  }

  const keyframeIndex = channel.keys.findIndex((keyframe) => keyframe.id === keyframeId);
  if (keyframeIndex < 0) {
    return animations;
  }

  const nextKeys = [...channel.keys];
  const currentKey = nextKeys[keyframeIndex];
  nextKeys[keyframeIndex] = {
    ...currentKey,
    leftHandle:
      patch.leftHandle === undefined
        ? currentKey.leftHandle
        : patch.leftHandle ?? undefined,
    rightHandle:
      patch.rightHandle === undefined
        ? currentKey.rightHandle
        : patch.rightHandle ?? undefined,
    segmentToNext: patch.segmentToNext ?? currentKey.segmentToNext,
    tangentMode: patch.tangentMode ?? currentKey.tangentMode,
  };

  return setBindingComponentChannel({
    animations,
    propertyPath,
    componentKey,
    channel: {
      keys: nextKeys,
      extrapolation: channel.extrapolation,
    },
  });
}


export function removeElementKeyframe({
  animations,
  propertyPath,
  keyframeId,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
  keyframeId: string;
}): ElementAnimations | undefined {
  const data = getChannelData({ animations, propertyPath });
  if (!data) {
    return animations;
  }

  const nextAnimations: ElementAnimations = { ...(animations ?? {}) };
  if (isLeafChannelData(data)) {
    nextAnimations[propertyPath] = removeKeyframe({ channel: data, keyframeId });
  } else if (isCompositeChannelData(data)) {
    let nextData: ChannelData | undefined = data;
    for (const [componentKey, channel] of Object.entries(data)) {
      nextData = setChannelInData({
        data: nextData,
        componentKey,
        channel: removeKeyframe({ channel, keyframeId }),
      });
    }
    nextAnimations[propertyPath] = nextData;
  }
  return toAnimation({
    animations: nextAnimations,
  });
}


export function retimeElementKeyframe({
  animations,
  propertyPath,
  keyframeId,
  time,
}: {
  animations: ElementAnimations | undefined;
  propertyPath: AnimationPath;
  keyframeId: string;
  time: MediaTime;
}): ElementAnimations | undefined {
  const data = getChannelData({ animations, propertyPath });
  if (!data) {
    return animations;
  }

  const nextAnimations: ElementAnimations = { ...(animations ?? {}) };
  if (isLeafChannelData(data)) {
    nextAnimations[propertyPath] = retimeKeyframe({
      channel: data,
      keyframeId,
      time,
    });
  } else if (isCompositeChannelData(data)) {
    let nextData: ChannelData | undefined = data;
    for (const [componentKey, channel] of Object.entries(data)) {
      nextData = setChannelInData({
        data: nextData,
        componentKey,
        channel: retimeKeyframe({ channel, keyframeId, time }),
      });
    }
    nextAnimations[propertyPath] = nextData;
  }
  return toAnimation({
    animations: nextAnimations,
  });
}

import type { AnimationChannel, ChannelData, ElementAnimations } from "./types";
import {
  getChannelsFromData,
  isCompositeChannelData,
  isLeafChannelData,
} from "./channel-data";

// Keyframe CRUD over the (composite-or-leaf) channel-data tree. The
// public API works in terms of ElementAnimations and AnimationPaths;
// callers do not touch the per-component channel shape directly.
//
// splitAnimationsAtTime is the trickiest — when the split lands inside
// a Bezier segment we use de Casteljau subdivision to produce two
// half-segments that exactly reproduce the original curve. Discrete
// channels just split at the boundary.

export function hasChannelKeys({
  channel,
}: {
  channel: AnimationChannel | undefined;
}): boolean {
  return Boolean(channel && channel.keys.length > 0);
}

function hasChannelData({ data }: { data: ChannelData | undefined }): boolean {
  return getChannelsFromData({ data }).some((channel) =>
    hasChannelKeys({ channel }),
  );
}

export function toAnimation({
  animations,
}: {
  animations: ElementAnimations;
}): ElementAnimations | undefined {
  const nextAnimations = Object.fromEntries(
    Object.entries(animations).filter(([, data]) => hasChannelData({ data })),
  );
  if (Object.keys(nextAnimations).length === 0) {
    return undefined;
  }

  return nextAnimations;
}

export function getChannelFromData({
  data,
  componentKey,
}: {
  data: ChannelData | undefined;
  componentKey: string;
}): AnimationChannel | undefined {
  if (isLeafChannelData(data)) {
    return componentKey === "value" ? data : undefined;
  }
  if (isCompositeChannelData(data)) {
    return data[componentKey];
  }
  return undefined;
}

export function setChannelInData({
  data,
  componentKey,
  channel,
}: {
  data: ChannelData | undefined;
  componentKey: string;
  channel: AnimationChannel | undefined;
}): ChannelData | undefined {
  if (componentKey === "value") {
    return channel;
  }
  const components = isCompositeChannelData(data) ? { ...data } : {};
  if (channel && hasChannelKeys({ channel })) {
    components[componentKey] = channel;
  } else {
    delete components[componentKey];
  }
  return Object.keys(components).length > 0 ? components : undefined;
}

export function getChannelDataEntries({
  data,
}: {
  data: ChannelData | undefined;
}): Array<[string, AnimationChannel | undefined]> {
  if (isLeafChannelData(data)) {
    return [["value", data]];
  }
  return isCompositeChannelData(data) ? Object.entries(data) : [];
}

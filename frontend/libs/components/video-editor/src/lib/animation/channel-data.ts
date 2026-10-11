import type {
  AnimationChannel,
  ChannelData,
  CompositeChannelData,
} from "./types";

// Tagged-union helpers for ChannelData. A param's animation storage is
// either a leaf channel (key array) or a composite (string-keyed
// record of leaf channels — used for colors which animate RGBA per
// component). These guards let callers handle both shapes without
// pattern-matching open-coded everywhere.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isLeafChannelData(
  data: ChannelData | undefined,
): data is AnimationChannel {
  return isRecord(data) && Array.isArray(data.keys);
}

export function isCompositeChannelData(
  data: ChannelData | undefined,
): data is CompositeChannelData {
  return isRecord(data) && !Array.isArray(data.keys);
}

export function getChannelsFromData({
  data,
}: {
  data: ChannelData | undefined;
}): AnimationChannel[] {
  if (isLeafChannelData(data)) {
    return [data];
  }
  if (!isCompositeChannelData(data)) {
    return [];
  }
  return Object.values(data).filter(isLeafChannelData);
}

export function getChannelEntriesFromData({
  data,
}: {
  data: ChannelData | undefined;
}): Array<[string, AnimationChannel]> {
  if (isLeafChannelData(data)) {
    return [["value", data]];
  }
  if (!isCompositeChannelData(data)) {
    return [];
  }
  return Object.entries(data).flatMap(([componentKey, channel]) =>
    isLeafChannelData(channel) ? [[componentKey, channel]] : [],
  );
}

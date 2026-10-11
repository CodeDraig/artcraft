import type { AnimationChannel, ElementAnimations } from "./types";
import {
  getChannelsFromData,
  isCompositeChannelData,
  isLeafChannelData,
} from "./channel-data";
import {
  isScalarChannel,
  normalizeDiscreteChannel,
  normalizeScalarChannel,
} from "./interpolation";
import { generateUUID } from "../utils/id";
import { toAnimation } from "./channel-state";

function cloneChannelWithKeyIds({
  channel,
  keyIdMap,
}: {
  channel: AnimationChannel;
  keyIdMap: Map<string, string>;
}): AnimationChannel {
  return isScalarChannel(channel)
    ? normalizeScalarChannel({
        channel: {
          ...channel,
          keys: channel.keys.map((key) => ({
            ...key,
            id: keyIdMap.get(key.id) ?? key.id,
          })),
        },
      })
    : normalizeDiscreteChannel({
        channel: {
          ...channel,
          keys: channel.keys.map((key) => ({
            ...key,
            id: keyIdMap.get(key.id) ?? key.id,
          })),
        },
      });
}

export function cloneAnimations({
  animations,
  shouldRegenerateKeyframeIds = false,
}: {
  animations: ElementAnimations | undefined;
  shouldRegenerateKeyframeIds?: boolean;
}): ElementAnimations | undefined {
  if (!animations) {
    return undefined;
  }

  const nextAnimations: ElementAnimations = { ...(animations ?? {}) };
  for (const [propertyPath, data] of Object.entries(animations)) {
    const channels = getChannelsFromData({ data });
    const primaryChannel = channels[0];
    const keyIdMap = new Map<string, string>();
    if (primaryChannel) {
      for (const key of primaryChannel.keys) {
        keyIdMap.set(
          key.id,
          shouldRegenerateKeyframeIds ? generateUUID() : key.id,
        );
      }
    }

    if (isLeafChannelData(data)) {
      nextAnimations[propertyPath] = cloneChannelWithKeyIds({
        channel: data,
        keyIdMap,
      });
      continue;
    }
    if (isCompositeChannelData(data)) {
      nextAnimations[propertyPath] = Object.fromEntries(
        Object.entries(data).map(([componentKey, channel]) => [
          componentKey,
          channel ? cloneChannelWithKeyIds({ channel, keyIdMap }) : undefined,
        ]),
      );
    }
  }

  return toAnimation({
    animations: nextAnimations,
  });
}

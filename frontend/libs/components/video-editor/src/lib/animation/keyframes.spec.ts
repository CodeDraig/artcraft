import { upsertPathKeyframe } from "./keyframes";
import { NUMBER_CHANNEL_LAYOUT } from "../params";
import { cloneAnimations } from "./clone-animations";
import { splitAnimationsAtTime } from "./split-animations";
import { getScalarChannelValueAtTime } from "./interpolation";
import type {
  CompositeChannelData,
  ScalarAnimationChannel,
  DiscreteAnimationChannel,
} from "./types";
import { mediaTime } from "../wasm";

const tick = (ticks: number) => mediaTime({ ticks });
const curve: ScalarAnimationChannel = {
  keys: [
    {
      id: "start",
      time: tick(0),
      value: 0,
      segmentToNext: "bezier",
      tangentMode: "broken",
      rightHandle: { dt: tick(200000), dv: 2 },
    },
    {
      id: "end",
      time: tick(1000000),
      value: 1,
      segmentToNext: "linear",
      tangentMode: "broken",
      leftHandle: { dt: tick(-300000), dv: -1 },
    },
  ],
};

describe("scalar keyframe edits", () => {
  it.each([undefined, "start"])("changes interpolation while preserving the existing key identity (%s)", (keyframeId) => {
    const before = JSON.stringify(curve);
    const result = upsertPathKeyframe({
      animations: { opacity: curve },
      propertyPath: "opacity",
      time: tick(0),
      value: 0.5,
      interpolation: "hold",
      keyframeId,
      channelLayout: NUMBER_CHANNEL_LAYOUT,
      coerceValue: ({ value }) => value,
    });
    const channel = result?.opacity as ScalarAnimationChannel;
    expect(channel.keys).toHaveLength(2);
    expect(channel.keys[0]).toMatchObject({ id: "start", time: 0, value: 0.5, segmentToNext: "step" });
    expect(JSON.stringify(curve)).toBe(before);
  });
});

describe("animation cloning and splitting", () => {
  it.each(["linear", "step"] as const)(
    "preserves %s scalar segments across the split boundary",
    (segmentToNext) => {
      const channel: ScalarAnimationChannel = {
        keys: curve.keys.map((key) => ({ ...key, segmentToNext })),
      };
      const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
        animations: { opacity: channel },
        splitTime: tick(400000),
      });
      for (const time of [0, 200000, 400000, 600000, 1000000]) {
        const splitChannel = (
          time <= 400000 ? leftAnimations?.opacity : rightAnimations?.opacity
        ) as ScalarAnimationChannel;
        const actual = getScalarChannelValueAtTime({
          channel: splitChannel,
          time: tick(time <= 400000 ? time : time - 400000),
          fallbackValue: 0,
        });
        const expected = getScalarChannelValueAtTime({
          channel,
          time: tick(time),
          fallbackValue: 0,
        });
        expect(actual).toBeCloseTo(expected, 6);
      }
    },
  );

  it("preserves the sampled Bezier curve on both sides of a split", () => {
    const before = JSON.stringify(curve);
    const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
      animations: { opacity: curve },
      splitTime: tick(400000),
    });
    for (let time = 0; time <= 1000000; time += 50000) {
      const channel = (
        time <= 400000 ? leftAnimations?.opacity : rightAnimations?.opacity
      ) as ScalarAnimationChannel;
      const value = getScalarChannelValueAtTime({
        channel,
        time: tick(time <= 400000 ? time : time - 400000),
        fallbackValue: 0,
      });
      const expected = getScalarChannelValueAtTime({
        channel: curve,
        time: tick(time),
        fallbackValue: 0,
      });
      expect(value).toBeCloseTo(expected, 4);
    }
    expect(JSON.stringify(curve)).toBe(before);
  });

  it("keeps regenerated key IDs aligned across composite components without mutating the source", () => {
    const channels = { r: curve, g: curve, b: curve, a: curve };
    const cloned = cloneAnimations({
      animations: { color: channels },
      shouldRegenerateKeyframeIds: true,
    })?.color as CompositeChannelData;
    for (const component of Object.values(cloned)) {
      expect(component?.keys.map((key) => key.id)).toEqual(
        cloned.r?.keys.map((key) => key.id),
      );
      expect(component?.keys[0].id).not.toBe("start");
    }
    expect(curve.keys.map((key) => key.id)).toEqual(["start", "end"]);
  });

  it("starts the right discrete channel with the held boundary value", () => {
    const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
      animations: {
        "params.enabled": {
          keys: [
            { id: "off", time: tick(0), value: false },
            { id: "on", time: tick(10), value: true },
          ],
        },
      },
      splitTime: tick(5),
    });
    const left = leftAnimations?.["params.enabled"] as DiscreteAnimationChannel;
    const right = rightAnimations?.[
      "params.enabled"
    ] as DiscreteAnimationChannel;
    expect(left.keys.at(-1)?.value).toBe(false);
    expect(right.keys.map(({ time, value }) => ({ time, value }))).toEqual([
      { time: 0, value: false },
      { time: 5, value: true },
    ]);
  });
});

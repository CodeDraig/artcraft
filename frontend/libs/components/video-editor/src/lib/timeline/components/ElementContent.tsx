import { createContext, useContext } from "react";
import { useEditor } from "../../editor/use-editor";
import { AudioWaveform, WAVEFORM_GAIN_SAMPLE_COUNT } from "./audio-waveform";
import { AudioVolumeLine } from "./audio-volume-line";
import { hasElementEffects } from "../element-utils";
import { getTrackHeight } from "./track-layout";
import { TIMELINE_TRACK_THEME } from "./theme";
import type {
  TimelineElement as TimelineElementType,
  TimelineTrack,
  VideoElement,
  ImageElement,
  AudioElement,
} from "../types";
import { buildWaveformGainSamples } from "../audio-state";
import { buildWaveformSourceKey } from "../../media/waveform-summary";
import { TICKS_PER_SECOND } from "../../wasm";
import { resolveStickerId } from "../../stickers";
import { buildGraphicPreviewUrl } from "../../graphics";
import { MagicWand05Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, type ReactNode } from "react";
import { cn } from "../../utils/ui";
import { usePropertiesStore } from "../../panels/properties/stores/properties-store";

export const PixelsPerSecondContext = createContext<number | null>(null);

const THUMBNAIL_ASPECT_RATIO = 16 / 9;

interface ElementContentProps {
  element: TimelineElementType;
  track: TimelineTrack;
}

function TextElementContent({
  element,
}: {
  element: Extract<TimelineElementType, { type: "text" }>;
}) {
  return (
    <div className="flex size-full items-center justify-start pl-2">
      <span className="truncate text-xs text-white">
        {typeof element.params.content === "string"
          ? element.params.content
          : ""}
      </span>
    </div>
  );
}

function EffectElementContent({
  element,
}: {
  element: Extract<TimelineElementType, { type: "effect" }>;
}) {
  return (
    <div className="flex size-full items-center justify-start gap-1 pl-2">
      <HugeiconsIcon
        icon={MagicWand05Icon}
        className="size-4 shrink-0 text-white"
      />
      <span className="truncate text-xs text-white">{element.name}</span>
    </div>
  );
}

function StickerElementContent({
  element,
}: {
  element: Extract<TimelineElementType, { type: "sticker" }>;
}) {
  return (
    <div className="flex size-full items-center gap-2 pl-2">
      <img
        src={resolveStickerId({
          stickerId: element.stickerId,
          options: { width: 20, height: 20 },
        })}
        alt={element.name}
        className="size-4 shrink-0"
        width={20}
        height={20}
      />
      <span className="truncate text-xs text-white">{element.name}</span>
    </div>
  );
}

function GraphicElementContent({
  element,
}: {
  element: Extract<TimelineElementType, { type: "graphic" }>;
}) {
  return (
    <div className="flex size-full items-center gap-2 pl-2">
      <img
        src={buildGraphicPreviewUrl({
          definitionId: element.definitionId,
          params: element.params,
          size: 20,
        })}
        alt={element.name}
        className="size-4 shrink-0"
        width={20}
        height={20}
      />
      <span className="truncate text-xs text-white">{element.name}</span>
    </div>
  );
}

function AudioElementContent({
  element,
  trackId,
}: {
  element: AudioElement;
  trackId: string;
}) {
  const pixelsPerSecond = useContext(PixelsPerSecondContext);
  if (pixelsPerSecond === null) {
    throw new Error(
      "AudioElementContent must be rendered inside PixelsPerSecondContext.Provider",
    );
  }
  const mediaAssets = useEditor((e) => e.media.getAssets());
  const mediaAsset =
    element.sourceType === "upload"
      ? (mediaAssets.find((asset) => asset.id === element.mediaId) ?? null)
      : null;

  const audioBuffer =
    element.sourceType === "library" ? element.buffer : undefined;
  const audioUrl =
    element.sourceType === "library" ? element.sourceUrl : mediaAsset?.url;
  const sourceFile =
    element.sourceType === "upload" ? mediaAsset?.file : undefined;
  const sourceKey =
    element.sourceType === "upload"
      ? buildWaveformSourceKey({ kind: "media", id: element.mediaId })
      : buildWaveformSourceKey({ kind: "library", id: element.sourceUrl });
  const mediaLabel = mediaAsset?.name ?? element.name;
  const gainSamples = useMemo(
    () =>
      buildWaveformGainSamples({
        element,
        count: WAVEFORM_GAIN_SAMPLE_COUNT,
      }),
    [element],
  );
  if (audioBuffer || audioUrl || sourceFile) {
    return (
      <div className="group/audio relative size-full">
        <MediaElementHeader name={mediaLabel} hasFade={false} />
        <div className="absolute inset-x-0 top-5 bottom-0 overflow-hidden">
          <AudioWaveform
            sourceKey={sourceKey}
            sourceFile={sourceFile}
            audioBuffer={audioBuffer}
            audioUrl={audioUrl}
            gainSamples={gainSamples}
            pixelsPerSecond={pixelsPerSecond}
            clipDurationSec={element.duration / TICKS_PER_SECOND}
            retime={element.retime}
            sourceStartSec={element.trimStart / TICKS_PER_SECOND}
            color={TIMELINE_TRACK_THEME.audio.waveformColor}
          />
          <AudioVolumeLine element={element} trackId={trackId} />
        </div>
      </div>
    );
  }

  return (
    <div className="group/audio relative size-full">
      <div className="flex size-full items-center pl-2">
        <span className="text-foreground/80 truncate text-xs">
          {element.name}
        </span>
      </div>
      <AudioVolumeLine element={element} trackId={trackId} />
    </div>
  );
}

function EffectsButton({
  element,
  track,
}: {
  element: VideoElement | ImageElement;
  track: TimelineTrack;
}) {
  const editor = useEditor();
  const setActiveTab = usePropertiesStore((s) => s.setActiveTab);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    editor.selection.setSelectedElements({
      elements: [{ trackId: track.id, elementId: element.id }],
    });
    setActiveTab({ elementType: element.type, tabId: "effects" });
  };

  return (
    <button
      type="button"
      className="flex shrink-0 justify-center text-white cursor-pointer"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleClick}
    >
      <HugeiconsIcon icon={MagicWand05Icon} size={12} />
    </button>
  );
}

function TiledMediaContent({
  element,
  track,
}: {
  element: VideoElement | ImageElement;
  track: TimelineTrack;
}) {
  const mediaAssets = useEditor((e) => e.media.getAssets());

  const mediaAsset = mediaAssets.find((asset) => asset.id === element.mediaId);
  const imageUrl =
    element.type === "video"
      ? mediaAsset?.thumbnailUrl
      : (mediaAsset?.thumbnailUrl ?? mediaAsset?.url);

  if (!imageUrl) {
    return (
      <span className="text-foreground/80 truncate text-xs">
        {element.name}
      </span>
    );
  }

  const trackHeight = getTrackHeight({ type: track.type });
  const tileWidth = trackHeight * THUMBNAIL_ASPECT_RATIO;

  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "var(--muted)",
          backgroundImage: `url(${imageUrl})`,
          backgroundRepeat: "repeat-x",
          backgroundSize: `${tileWidth}px ${trackHeight}px`,
          backgroundPosition: "left center",
          pointerEvents: "none",
        }}
      />
      <MediaElementHeader
        name={mediaAsset?.name}
        leading={
          hasElementEffects({ element }) ? (
            <EffectsButton element={element} track={track} />
          ) : null
        }
        hasFade={true}
      />
    </>
  );
}

function MediaElementHeader({
  name,
  leading,
  hasFade,
}: {
  name?: string | null;
  leading?: ReactNode;
  hasFade?: boolean;
}) {
  if (!name && !leading) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-0 left-0 flex h-5 w-full bg-linear-to-b pt-1",
        hasFade && "from-black/30 to-transparent",
      )}
    >
      {leading && <div className="pl-1">{leading}</div>}
      {name && (
        <span className="truncate px-1.5 text-[0.6rem] leading-tight text-white/75">
          {name}
        </span>
      )}
    </div>
  );
}

export function ElementContent({ element, track }: ElementContentProps) {
  switch (element.type) {
    case "text":
      return <TextElementContent element={element} />;
    case "effect":
      return <EffectElementContent element={element} />;
    case "sticker":
      return <StickerElementContent element={element} />;
    case "graphic":
      return <GraphicElementContent element={element} />;
    case "audio":
      return <AudioElementContent element={element} trackId={track.id} />;
    case "video":
    case "image":
      return <TiledMediaContent element={element} track={track} />;
  }
}

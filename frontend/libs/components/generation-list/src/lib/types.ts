// Canonical data shapes for the merged generation feed (in-progress / failed /
// completed). Hosts (webapp, desktop) map their own job sources into these.

export type GenerationMediaClass =
  | "image"
  | "video"
  | "audio"
  | "mesh"
  | "splat";

export function is3DMediaClass(mediaClass: string | undefined | null): boolean {
  return (
    mediaClass === "mesh" ||
    mediaClass === "splat"
  );
}

/** Plural noun for batch captions, e.g. "Generating 4 images". */
export function batchNoun(mediaClass: GenerationMediaClass): string {
  switch (mediaClass) {
    case "video":
      return "videos";
    case "audio":
      return "audio clips";
    case "mesh":
      return "3D models";
    case "splat":
      return "3D worlds";
    default:
      return "images";
  }
}

export interface GalleryItem {
  id: string;
  label: string;
  thumbnail: string | null;
  // Still first-frame thumbnail for videos, shown when the user turns off
  // animated previews (thumbnail holds the animated one).
  stillThumbnail?: string | null;
  fullImage: string | null;
  createdAt: string;
  mediaClass: string;
  modelId?: string;
  batchImageToken?: string;
  // Token for the generation's prompt record. The list view resolves it
  // (via the shared prompts cache) to show the real prompt + model.
  promptToken?: string;
  // Playback length for audio (and video) items, when the API knows it.
  durationMillis?: number;
}

export interface InProgressJob {
  id: string;
  prompt: string;
  modelId: string;
  modelLabel: string;
  progress: number;
  estimatedTimeLeftMs?: number;
  createdAt: string;
  batchCount?: number;
  // Prompt token + media class enable the "Recreate" action while the job is
  // still running, mirroring the failed/completed cards.
  promptToken?: string;
  mediaClass: GenerationMediaClass;
}

export interface FailedJob {
  id: string;
  prompt: string;
  modelId: string;
  modelLabel: string;
  failureReason?: string;
  failureMessage?: string;
  status: string;
  createdAt: string;
  promptToken?: string;
  refImageUrl?: string;
  mediaClass: GenerationMediaClass;
}

import { VideoModel } from "../classes/VideoModel.js";
import { SizeIconOption, SizeOption } from "../classes/metadata/SizeOption.js";
import type { ListingVideoModel } from "./ListingModel.js";
import { buildCatalog } from "./buildCatalog.js";
import { creatorFor } from "./creatorFor.js";

export const buildVideoModelsFromListing = (
  overlay: VideoModel[],
  listing: ListingVideoModel[],
  offeredModelIds: string[] = [],
): VideoModel[] =>
  buildCatalog(overlay, listing, offeredModelIds, mergedVideoModel);

const mergedVideoModel = (
  m: ListingVideoModel,
  tauriId: string,
  o: VideoModel | undefined,
): VideoModel => {
  const aspectRatios = m.aspect_ratio_options ?? [];
  const fullName = m.full_name ?? o?.fullName ?? m.model;

  return new VideoModel({
    // Identity. Keep the overlay's `id` (BY_ID lookups / history) when known.
    id: o?.id ?? tauriId,
    tauriId,
    fullName,
    category: "video",
    creator: creatorFor(m.model_creator, m.model, o?.creator),

    // Presentation. The video API DOES have descriptions (extra_info_short /
    // extra_info) — prefer them so backend copy reaches the picker.
    selectorName: o?.selectorName ?? fullName,
    selectorDescription:
      m.extra_info_short ?? m.extra_info ?? o?.selectorDescription ?? "",
    selectorBadges: o?.selectorBadges ?? [],
    tags: o?.tags ?? [],
    progressBarTime: o?.progressBarTime,
    supportsSystemPrompt: o?.supportsSystemPrompt,

    // Desktop-native provider knowledge.
    providers: o?.getProviders(),

    // Capabilities come from the API for models present in its catalog.
    maxPromptLength: m.text_prompt_max_length ?? undefined,
    startFrame: m.starting_keyframe_supported ?? false,
    endFrame: m.ending_keyframe_supported ?? false,
    requiresImage: m.starting_keyframe_required ?? false,
    textToVideoSupported: m.text_to_video_supported ?? undefined,
    generateWithSound: m.show_generate_with_sound_toggle ?? undefined,
    durationOptions: m.duration_seconds_options ?? undefined,
    defaultDuration: m.duration_seconds_default ?? undefined,
    minDuration: m.duration_seconds_min ?? undefined,
    maxDuration: m.duration_seconds_max ?? undefined,
    maxDurationWithImageReferences:
      m.duration_seconds_max_with_image_references ?? undefined,
    bitrateOptions: m.bitrate_options ?? undefined,
    defaultBitrate: m.bitrate_default ?? undefined,
    outputFormatOptions: m.output_format_options ?? undefined,
    defaultOutputFormat: m.output_format_default ?? undefined,
    generationCountOptions: m.batch_size_options ?? undefined,
    defaultGenerationCount: m.batch_size_default ?? undefined,
    defaultAspectRatio: m.aspect_ratio_default ?? undefined,
    supportsReferenceMode: m.image_references_supported ?? undefined,
    maxReferenceImages: m.image_references_max ?? undefined,
    maxReferenceVideos: m.video_references_max ?? undefined,
    maxVideoRefDuration:
      m.video_references_max_total_duration_seconds ?? undefined,
    maxReferenceAudios: m.audio_references_max ?? undefined,
    maxAudioRefDuration:
      m.audio_references_max_total_duration_seconds ?? undefined,
    resolutionOptions: m.resolution_options ?? undefined,
    defaultResolution: m.resolution_default ?? undefined,
    sizeOptions: aspectRatios.map(sizeOptionForAspectRatio),
    supportsCommonAspectRatio: aspectRatios.length > 0,
  });
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive a video size picker option from a CommonAspectRatio value.
 * `tauriValue` is the CommonAspectRatio serde string sent in the request.
 */
const sizeOptionForAspectRatio = (value: string): SizeOption => {
  switch (value) {
    case "square":
      return {
        tauriValue: value,
        textLabel: "1:1",
        icon: SizeIconOption.Square,
      };
    case "square_hd":
      return {
        tauriValue: value,
        textLabel: "1:1 HD",
        icon: SizeIconOption.Square,
      };
    case "wide_sixteen_by_nine":
      return {
        tauriValue: value,
        textLabel: "16:9",
        icon: SizeIconOption.Landscape16x9,
      };
    case "tall_nine_by_sixteen":
      return {
        tauriValue: value,
        textLabel: "9:16",
        icon: SizeIconOption.Portrait9x16,
      };
    case "wide_four_by_three":
      return {
        tauriValue: value,
        textLabel: "4:3",
        icon: SizeIconOption.Standard4x3,
      };
    case "tall_three_by_four":
      return {
        tauriValue: value,
        textLabel: "3:4",
        icon: SizeIconOption.Portrait3x4,
      };
    case "wide_three_by_two":
      return {
        tauriValue: value,
        textLabel: "3:2",
        icon: SizeIconOption.Landscape,
      };
    case "tall_two_by_three":
      return {
        tauriValue: value,
        textLabel: "2:3",
        icon: SizeIconOption.Portrait,
      };
    case "wide_five_by_four":
      return {
        tauriValue: value,
        textLabel: "5:4",
        icon: SizeIconOption.Landscape,
      };
    case "tall_four_by_five":
      return {
        tauriValue: value,
        textLabel: "4:5",
        icon: SizeIconOption.Portrait,
      };
    case "wide_twenty_one_by_nine":
      return {
        tauriValue: value,
        textLabel: "21:9",
        icon: SizeIconOption.Landscape16x9,
      };
    case "tall_nine_by_twenty_one":
      return {
        tauriValue: value,
        textLabel: "9:21",
        icon: SizeIconOption.Portrait9x16,
      };
    case "wide":
      return {
        tauriValue: value,
        textLabel: "Landscape",
        icon: SizeIconOption.Landscape,
      };
    case "tall":
      return {
        tauriValue: value,
        textLabel: "Portrait",
        icon: SizeIconOption.Portrait,
      };
    case "auto":
      return {
        tauriValue: value,
        textLabel: "Auto",
        icon: SizeIconOption.Square,
      };
    default:
      return {
        tauriValue: value,
        textLabel: value,
        icon: SizeIconOption.Square,
      };
  }
};

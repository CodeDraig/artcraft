import { GenerationProvider } from "@storyteller/api-enums";
import { ImageModel } from "../classes/ImageModel.js";
import { CommonAspectRatio } from "../classes/properties/CommonAspectRatio.js";
import { CommonResolution } from "../classes/properties/CommonResolution.js";
import { CommonQuality } from "../classes/properties/CommonQuality.js";
import type { ListingImageModel } from "./ListingModel.js";
import { buildCatalog } from "./buildCatalog.js";
import { creatorFor } from "./creatorFor.js";

export const buildImageModelsFromListing = (
  overlay: ImageModel[],
  listing: ListingImageModel[],
  offeredModelIds: string[] = [],
): ImageModel[] =>
  buildCatalog(overlay, listing, offeredModelIds, mergedImageModel);

const mergedImageModel = (
  m: ListingImageModel,
  tauriId: string,
  o: ImageModel | undefined,
): ImageModel => {
  const aspectRatios = m.aspect_ratio_options ?? [];
  const resolutions = m.resolution_options ?? [];
  const qualityOptions = m.quality_options ?? [];
  const fullName = m.full_name ?? o?.fullName ?? m.model;

  return new ImageModel({
    // Identity. Keep the overlay's `id` (BY_ID lookups / history) when known.
    id: o?.id ?? tauriId,
    tauriId,
    fullName,
    category: "image",
    creator: creatorFor(m.model_creator, m.model, o?.creator),

    // Presentation — the omni image API has no display fields yet.
    selectorName: o?.selectorName ?? fullName,
    selectorDescription: o?.selectorDescription ?? "",
    selectorBadges: o?.selectorBadges ?? [],
    tags: o?.tags ?? [],
    progressBarTime: o?.progressBarTime,

    // Page-subsetting flags — frontend-owned concepts.
    canTextToImage: o ? o.canTextToImage : m.text_prompt_supported !== false,
    canEditImages: o?.canEditImages ?? false,
    usesInpaintingMask: o?.usesInpaintingMask ?? false,
    editingIsInpainting: o?.editingIsInpainting ?? false,
    canEditAngles: o?.canEditAngles ?? false,

    // Desktop-native provider knowledge.
    providers: ["midjourney_7", "midjourney_7_niji", "midjourney_8"].includes(
      tauriId,
    )
      ? [GenerationProvider.Artcraft, GenerationProvider.Midjourney]
      : o?.getProviders(),

    // Capabilities come from the API for models present in its catalog.
    maxPromptLength: m.text_prompt_max_length ?? undefined,
    maxGenerationCount: m.batch_size_max ?? 4,
    defaultGenerationCount: m.batch_size_default ?? 1,
    predefinedGenerationCounts: m.batch_size_options ?? undefined,
    canUseImagePrompt: m.image_refs_supported ?? false,
    maxImagePromptCount: m.image_refs_max ?? 1,
    canChangeAspectRatio: aspectRatios.length > 0,
    aspectRatios: aspectRatios as CommonAspectRatio[],
    defaultAspectRatio: m.aspect_ratio_default as CommonAspectRatio | undefined,
    canChangeResolution: resolutions.length > 0,
    resolutions: resolutions as CommonResolution[],
    defaultResolution: m.resolution_default as CommonResolution | undefined,
    qualityOptions: qualityOptions as CommonQuality[],
    defaultQuality: m.default_quality as CommonQuality | undefined,
  });
};

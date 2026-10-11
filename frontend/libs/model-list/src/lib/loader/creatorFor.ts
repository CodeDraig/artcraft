import {
  ModelCreator,
  modelCreatorFromBackend,
} from "../classes/metadata/ModelCreator.js";
import { MODEL_ID_PREFIX_CREATORS } from "../classes/metadata/ModelCreatorIconForId.js";

// Guess a creator from the API's `model_creator`, then the overlay, then the
// model-id prefix, then ArtCraft.
export const creatorFor = (
  raw: string | null | undefined,
  modelId: string,
  overlayCreator: ModelCreator | undefined,
): ModelCreator => {
  const mapped = modelCreatorFromBackend(raw ?? undefined);
  if (mapped) return mapped;
  if (overlayCreator) return overlayCreator;
  for (const [prefix, creator] of MODEL_ID_PREFIX_CREATORS) {
    if (modelId.startsWith(prefix)) return creator;
  }
  return ModelCreator.ArtCraft;
};

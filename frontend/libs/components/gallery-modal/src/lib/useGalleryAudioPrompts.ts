import { useMemo, useCallback } from "react";
import {
  useMediaPromptTokens,
  usePrompts,
} from "@storyteller/ui-generation-list";
import type { GalleryItem } from "./GalleryItem";

export function useGalleryAudioPrompts(
  allItems: GalleryItem[],
  activeFolderItems: GalleryItem[],
) {
  // Audio tiles have no thumbnail, so they show their prompt text instead.
  // Resolve it via the shared batched caches (media token → prompt token →
  // prompt text) for audio items only; image/video walls skip the lookups.
  const audioMediaTokensNeedingPrompt = useMemo(() => {
    const tokens: string[] = [];
    const collect = (item: GalleryItem) => {
      if (item.mediaClass === "audio" && !item.promptToken) {
        tokens.push(item.id);
      }
    };
    allItems.forEach(collect);
    activeFolderItems.forEach(collect);
    return tokens;
  }, [allItems, activeFolderItems]);
  const resolvedAudioPromptTokens = useMediaPromptTokens(
    audioMediaTokensNeedingPrompt,
  );

  const audioPromptTokens = useMemo(() => {
    const tokens: string[] = [];
    const collect = (item: GalleryItem) => {
      if (item.mediaClass !== "audio") return;
      const token = item.promptToken || resolvedAudioPromptTokens.get(item.id);
      if (token) tokens.push(token);
    };
    allItems.forEach(collect);
    activeFolderItems.forEach(collect);
    return tokens;
  }, [allItems, activeFolderItems, resolvedAudioPromptTokens]);
  const audioPromptsMap = usePrompts(audioPromptTokens);

  const audioPromptTextFor = useCallback(
    (item: GalleryItem): string | undefined => {
      if (item.mediaClass !== "audio") return undefined;
      const token = item.promptToken || resolvedAudioPromptTokens.get(item.id);
      return (
        (token
          ? audioPromptsMap.get(token)?.maybe_positive_prompt
          : undefined) || undefined
      );
    },
    [resolvedAudioPromptTokens, audioPromptsMap],
  );

  return audioPromptTextFor;
}

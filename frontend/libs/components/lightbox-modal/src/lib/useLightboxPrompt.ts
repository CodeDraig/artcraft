import { useEffect, useMemo, useState } from "react";
import { MediaFilesApi, PromptsApi } from "@storyteller/api";
import type { Prompts, UserInfo } from "@storyteller/api";

export function useLightboxPrompt(mediaId?: string) {
  const [promptData, setPromptData] = useState<Prompts | null>(null);
  const [promptLoading, setPromptLoading] = useState<boolean>(false);
  const [hasPromptToken, setHasPromptToken] = useState<boolean>(false);
  const [creator, setCreator] = useState<UserInfo | null>(null);
  const mediaFilesApi = useMemo(() => new MediaFilesApi(), []);
  const promptsApi = useMemo(() => new PromptsApi(), []);
  // Fetch prompt when mediaId changes — debounced to avoid API spam during
  // rapid next/prev navigation, with cancellation for stale responses.
  useEffect(() => {
    if (!mediaId) {
      setPromptData(null);
      setHasPromptToken(false);
      setPromptLoading(false);
      setCreator(null);
      return;
    }

    // Immediately show skeletons & clear stale data
    setPromptLoading(true);
    setPromptData(null);
    setCreator(null);

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const mediaResponse = await mediaFilesApi.GetMediaFileByToken({
          mediaFileToken: mediaId,
        });
        if (cancelled) return;

        if (mediaResponse.success && mediaResponse.data) {
          setCreator(mediaResponse.data.maybe_creator_user || null);
        }

        if (mediaResponse.success && mediaResponse.data?.maybe_prompt_token) {
          setHasPromptToken(true);
          const promptResponse = await promptsApi.GetPromptsByToken({
            token: mediaResponse.data.maybe_prompt_token,
          });
          if (cancelled) return;

          if (promptResponse.success && promptResponse.data) {
            setPromptData(promptResponse.data);
          } else {
            setPromptData(null);
          }
        } else {
          setHasPromptToken(false);
          setPromptData(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching prompt:", error);
        setHasPromptToken(false);
        setPromptData(null);
      } finally {
        if (!cancelled) setPromptLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mediaId, mediaFilesApi, promptsApi]);

  return { promptData, promptLoading, hasPromptToken, creator };
}

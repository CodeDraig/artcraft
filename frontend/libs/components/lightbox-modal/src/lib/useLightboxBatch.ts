import { useEffect, useMemo, useState } from "react";
import { MediaFilesApi } from "@storyteller/api";

export function useLightboxBatch(
  batchImageToken?: string,
  mediaId?: string,
  imageUrl?: string | null,
) {
  const [batchImages, setBatchImages] = useState<string[] | null>(null);
  const [batchTokens, setBatchTokens] = useState<string[] | null>(null);
  const mediaFilesApi = useMemo(() => new MediaFilesApi(), []);
  // Fetch batch images — debounced + cancellable like fetchPrompt above.
  useEffect(() => {
    if (!batchImageToken) {
      setBatchImages(null);
      setBatchTokens(null);
      return;
    }

    // Clear stale batch data immediately
    setBatchImages(null);
    setBatchTokens(null);

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response = await mediaFilesApi.GetMediaFilesByBatchToken({
          batchToken: batchImageToken,
        });
        if (cancelled) return;

        if (response.success && response.data?.length) {
          const items = response.data
            .map((file: any) => ({
              url: file.media_links?.cdn_url,
              token: file.token,
            }))
            .filter(
              (item): item is { url: string; token: string } =>
                Boolean(item.url) && Boolean(item.token),
            );

          if (items.length > 0) {
            const primaryToken = mediaId;
            const primaryUrl = imageUrl;

            const sortedItems = [...items].sort((a, b) => {
              if (primaryToken === a.token) return -1;
              if (primaryToken === b.token) return 1;
              if (primaryUrl === a.url) return -1;
              if (primaryUrl === b.url) return 1;
              return 0;
            });

            setBatchImages(sortedItems.map((item) => item.url));
            setBatchTokens(sortedItems.map((item) => item.token));
          } else {
            setBatchImages(null);
            setBatchTokens(null);
          }
        } else {
          setBatchImages(null);
          setBatchTokens(null);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        setBatchImages(null);
        setBatchTokens(null);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [batchImageToken, mediaId, imageUrl, mediaFilesApi]);

  return { batchImages, batchTokens };
}

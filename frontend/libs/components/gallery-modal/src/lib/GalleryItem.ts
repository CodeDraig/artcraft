export interface GalleryItem {
  id: string;
  label: string;
  thumbnail: string | null;
  // Thumbnail template is not a usable URL yet. It has some variables
  // like `{WIDTH}` which must be replaced downstream.
  thumbnailUrlTemplate?: string;
  fullImage?: string | null;
  createdAt: string;
  mediaClass?: string;
  assetType?: string;
  isUpload?: boolean;
  batchImageToken?: string;
  mediaTokens?: string[];
  imageUrls?: string[];
  /** Prompt token, when the list endpoint returns one (used by audio tiles). */
  promptToken?: string;
  /** Duration for audio/video items, when known. */
  durationMillis?: number;
}

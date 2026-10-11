import type {
  FolderMediaFileListItem,
  TagMediaFileListItem,
} from "@storyteller/api";
import {
  getThumbnailUrl,
  getMediaThumbnail,
  THUMBNAIL_SIZES,
} from "@storyteller/common";
import type { GalleryItem } from "./GalleryItem";
const is3DClass = (mediaClass: string | undefined | null): boolean =>
  mediaClass === "mesh" || mediaClass === "splat";

const getLabel = (item: any) => {
  if (!!item.maybe_title) {
    return item.maybe_title;
  }
  switch (item.media_class) {
    case "image":
      return "Image Generation";
    case "video":
      return "Video Generation";
    case "audio":
      return "Audio Generation";
    case "mesh":
      return "3D Object Generation";
    case "splat":
      return "3D World Generation";
    default:
      return "Generation";
  }
};

// Map raw API item to GalleryItem
export const mapApiItem = (item: any): GalleryItem => ({
  id: item.token,
  label: getLabel(item),
  thumbnail:
    item.media_class === "audio"
      ? null
      : item.media_class === "video"
        ? item.media_links.maybe_video_previews?.animated
        : is3DClass(item.media_class)
          ? item.cover_image?.maybe_links?.cdn_url
          : getThumbnailUrl(item.media_links.maybe_thumbnail_template, {
              width: THUMBNAIL_SIZES.MEDIUM,
            }),
  thumbnailUrlTemplate: item.media_links.maybe_thumbnail_template,
  fullImage: item.media_links.cdn_url,
  createdAt: item.created_at,
  mediaClass:
    item.media_class ||
    (item.filter_media_classes ? item.filter_media_classes[0] : "image"),
  isUpload: item.origin_category === "upload",
  assetType:
    item.media_class === "mesh"
      ? item.maybe_animation_type ||
        item.origin_product_category === "character" ||
        (item.origin && item.origin.product_category === "character")
        ? "character"
        : "object"
      : item.media_class === "splat"
        ? "splat"
        : undefined,
  promptToken: item.maybe_prompt_token ?? undefined,
  durationMillis: item.maybe_duration_millis ?? undefined,
});

// Map a folder/tag media-file list item → GalleryItem (same lean wire
// shape). The list item already carries media_links/cover, so no batch-get
// is needed (unlike `mapApiItem`, which reads the raw user-media list
// shape: origin_category / no batch token).
export const mapFolderListItem = (
  item: FolderMediaFileListItem | TagMediaFileListItem,
): GalleryItem => ({
  id: item.token,
  label: getLabel(item),
  thumbnail:
    item.media_class === "audio"
      ? null
      : is3DClass(item.media_class)
        ? (item.cover_image?.maybe_links?.cdn_url ?? null)
        : getMediaThumbnail(item.media_links, item.media_class, {
            size: THUMBNAIL_SIZES.MEDIUM,
          }),
  thumbnailUrlTemplate: item.media_links?.maybe_thumbnail_template ?? undefined,
  fullImage: item.media_links?.cdn_url ?? null,
  createdAt: item.created_at,
  mediaClass: item.media_class || "image",
  isUpload: !!item.is_user_upload,
  batchImageToken: item.maybe_batch_token ?? undefined,
  promptToken: item.maybe_prompt_token ?? undefined,
  durationMillis: item.maybe_duration_millis ?? undefined,
});

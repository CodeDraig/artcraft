import type { GalleryItem } from "./GalleryItem";
// ─── Module-level gallery cache ───────────────────────────────────────────────
// Persists gallery items across modal open/close so users see content instantly.
interface GalleryCacheEntry {
  items: GalleryItem[];
  pageIndex: number;
  hasMore: boolean;
  timestamp: number;
  /** Keyset cursor for the mesh/splat tabs (their endpoints paginate by cursor). */
  cursor?: string;
}

export const galleryCacheMap = new Map<string, GalleryCacheEntry>();

/** Clear the module-level gallery item cache. Call on logout so the next user doesn't see stale items. */
export const clearGalleryCache = () => {
  galleryCacheMap.clear();
};

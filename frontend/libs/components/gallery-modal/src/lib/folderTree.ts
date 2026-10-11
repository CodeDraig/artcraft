import type { GalleryFolder } from "./GalleryDraggableItem";

type Folder = Pick<GalleryFolder, "id" | "name" | "parentId">;

export function getRootFolderId(
  folders: readonly Folder[],
  activeFolderId: string | null,
): string | null {
  if (!activeFolderId) return null;
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const seen = new Set<string>();
  let cursor = byId.get(activeFolderId);
  while (cursor && cursor.parentId && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    cursor = byId.get(cursor.parentId);
  }
  return cursor?.id ?? null;
}

export function getFolderPath(
  folders: readonly Folder[],
  activeFolderId: string | null,
): { id: string; name: string }[] {
  const path: { id: string; name: string }[] = [];
  if (!activeFolderId) return path;
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const seen = new Set<string>();
  let cursor = byId.get(activeFolderId);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift({ id: cursor.id, name: cursor.name });
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return path;
}

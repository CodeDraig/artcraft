import { mapApiItem, mapFolderListItem } from "./galleryItemMapping";

describe("gallery media mapping", () => {
  const media = {
    token: "media",
    created_at: "2026-10-10T12:00:00Z",
    media_links: { cdn_url: "https://media.test/model.glb" },
    cover_image: {
      maybe_links: { cdn_url: "https://media.test/cover.png" },
      maybe_cover_image_public_bucket_url: "https://old.test/cover.png",
    },
  };

  it("keeps mesh and splat display and drag identities distinct", () => {
    expect(mapApiItem({ ...media, media_class: "mesh" })).toMatchObject({
      label: "3D Object Generation",
      thumbnail: "https://media.test/cover.png",
      assetType: "object",
      mediaClass: "mesh",
    });
    expect(mapApiItem({ ...media, media_class: "splat" })).toMatchObject({
      label: "3D World Generation",
      thumbnail: "https://media.test/cover.png",
      assetType: "splat",
      mediaClass: "splat",
    });
  });

  it("does not resolve the retired bucket URL or classify old dimensional records as meshes", () => {
    const oldCover = {
      maybe_cover_image_public_bucket_url: "https://old.test/cover.png",
    };
    expect(
      mapApiItem({ ...media, media_class: "mesh", cover_image: oldCover })
        .thumbnail,
    ).toBeUndefined();
    expect(
      mapFolderListItem({
        ...media,
        media_class: "mesh",
        cover_image: oldCover,
      } as any).thumbnail,
    ).toBeNull();
    expect(mapApiItem({ ...media, media_class: "dimensional" })).toMatchObject({
      label: "Generation",
      assetType: undefined,
    });
  });
});

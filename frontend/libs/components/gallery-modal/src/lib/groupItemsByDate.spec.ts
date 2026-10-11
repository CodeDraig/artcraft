import { describe, expect, it } from "vitest";
import type { GalleryItem } from "./GalleryItem";
import { groupItemsByDate } from "./groupItemsByDate";

describe("gallery date groups", () => {
  it("orders groups newest first, retaining item order and input ownership", () => {
    const items = [
      item("old", "2026-07-01T12:00:00Z"),
      item("new-first", "2026-07-03T12:00:00Z"),
      item("new-second", "2026-07-03T13:00:00Z"),
    ];
    const before = [...items];
    expect(
      Object.values(groupItemsByDate(items)).map((group) =>
        group.map((entry) => entry.id),
      ),
    ).toEqual([["new-first", "new-second"], ["old"]]);
    expect(items).toEqual(before);
    expect(groupItemsByDate([])).toEqual({});
  });
});

function item(id: string, createdAt: string): GalleryItem {
  return { id, createdAt, label: id, thumbnail: null };
}

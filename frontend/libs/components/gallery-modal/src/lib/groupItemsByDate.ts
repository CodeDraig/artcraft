import type { GalleryItem } from "./GalleryItem";
const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const groupItemsByDate = (items: GalleryItem[]) => {
  const grouped = items.reduce((acc: Record<string, GalleryItem[]>, item) => {
    const dateKey = formatDate(item.createdAt);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Sort dates in descending order
  return Object.fromEntries(
    Object.entries(grouped).sort(
      (a, b) =>
        new Date(b[1][0].createdAt).getTime() -
        new Date(a[1][0].createdAt).getTime(),
    ),
  );
};

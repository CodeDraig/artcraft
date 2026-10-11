import { useMemo } from "react";
import type { TagDetails } from "@storyteller/api";
import { twMerge } from "tailwind-merge";
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
};

/**
 * The all-tags browser view: a word cloud where font size and emphasis encode
 * use count, and a deterministic hash shuffle spreads big words among small
 * ones (stable order — no reflow between renders). Mirrors the webapp's
 * library Tags tab.
 */
export function TagCloudView({
  tags,
  onOpen,
}: {
  tags: TagDetails[];
  onOpen: (tagToken: string) => void;
}) {
  const words = useMemo(() => {
    const counts = tags.map((t) => t.use_count);
    const min = Math.min(...counts);
    const span = Math.max(1, Math.max(...counts) - min);
    return [...tags]
      .sort((a, b) => hashString(a.tag_token) - hashString(b.tag_token))
      .map((tag) => ({
        tag,
        // sqrt compresses the top end so one mega-tag doesn't dwarf the rest.
        weight: Math.sqrt((tag.use_count - min) / span),
      }));
  }, [tags]);

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="flex max-w-3xl flex-wrap items-baseline justify-center gap-x-5 gap-y-3 select-none">
        {words.map(({ tag, weight }) => (
          <button
            key={tag.tag_token}
            type="button"
            onClick={() => onOpen(tag.tag_token)}
            title={`${tag.use_count} file${tag.use_count === 1 ? "" : "s"}`}
            style={{ fontSize: `${Math.round(15 + weight * 33)}px` }}
            className={twMerge(
              "max-w-full truncate leading-none transition-all duration-200 hover:scale-110 hover:text-violet-400",
              hashString(tag.tag_token) % 2 === 0
                ? "hover:rotate-2"
                : "hover:-rotate-2",
              weight > 0.66
                ? "font-bold text-base-fg"
                : weight > 0.33
                  ? "font-semibold text-base-fg/70"
                  : "font-medium text-base-fg/40",
            )}
          >
            {tag.tag_value}
          </button>
        ))}
      </div>
    </div>
  );
}

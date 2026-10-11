import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { PopoverItem } from "./PopoverItem";
import { InfoHint } from "./InfoHint";

interface RichListRowProps {
  item: PopoverItem;
  onClick?: () => void;
  // Highlight the row while its flyout/tooltip is open.
  active?: boolean;
  // Overrides the default right-side selection check (e.g. a submenu chevron).
  rightNode?: ReactNode;
}

// One rich-list row (icon tile, name, description, badges). Shared between the
// main richList panel and the submenu flyout so group children render
// identically to top-level rows.
export function RichListRow({
  item,
  onClick,
  active = false,
  rightNode,
}: RichListRowProps) {
  return (
    <div
      data-selected={item.selected ? "true" : undefined}
      onClick={() => {
        if (!item.disabled) onClick?.();
      }}
      className={twMerge(
        "group flex cursor-pointer items-center gap-3 rounded-[3px] px-2 py-2 transition-colors",
        item.selected ? "bg-white/10" : "hover:bg-white/5",
        !item.selected && active ? "bg-white/5" : "",
        item.disabled ? "!cursor-not-allowed opacity-50" : "",
      )}
    >
      <span
        className={twMerge(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-none border text-base-fg/80 transition-colors",
          item.selected
            ? "border-white bg-white/10"
            : "border-ui-controls-border bg-white/5",
        )}
      >
        {item.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={twMerge(
              "truncate font-semibold",
              item.selected ? "text-base-fg" : "text-base-fg/90",
            )}
          >
            {item.label}
          </span>
          {item.info ? <InfoHint content={item.info} /> : null}
        </div>
        {item.description && (
          <span className="truncate text-xs text-base-fg/55">
            {item.description}
          </span>
        )}
        {item.badges &&
          Array.isArray(item.badges) &&
          item.badges.length > 0 && (
            <div className="mt-1 flex flex-row flex-wrap gap-1">
              {item.badges.map((badge, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-none bg-ui-badge px-1.5 py-0.5 text-xs font-medium text-base-fg"
                >
                  {badge?.icon && <span>{badge.icon}</span>}
                  {badge?.label || ""}
                </span>
              ))}
            </div>
          )}
      </div>
      {item.trailing && (
        <div className="ml-1 flex shrink-0 items-center">{item.trailing}</div>
      )}
      {rightNode ??
        (item.selected &&
          (item.selectedRight ?? (
            <span className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center">
              <CheckIcon
                aria-hidden="true"
                className="h-4 w-4 text-white"
                strokeWidth={2.5}
              />
            </span>
          )))}
    </div>
  );
}

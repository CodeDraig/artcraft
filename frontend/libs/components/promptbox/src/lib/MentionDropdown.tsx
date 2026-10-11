import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";
import { MusicIcon, UserIcon, VideoIcon } from "lucide-react";
import { DynamicIcon } from "@storyteller/icons";
import type { MentionItem } from "./MentionItem";

const DROPDOWN_MARGIN = 8;
// Natural height cap — must match the panel's `max-h-72` class.
const DROPDOWN_MAX_HEIGHT = 288;
// Minimum useful panel height before placement stops shrinking it further.
const DROPDOWN_MIN_HEIGHT = 96;

export function MentionDropdown({
  items,
  activeIndex,
  onSelect,
  onHover,
  position,
}: {
  items: MentionItem[];
  activeIndex: number;
  onSelect: (item: MentionItem) => void;
  onHover: (index: number) => void;
  /** Viewport-space caret coordinates (the "@" trigger). */
  position: { left: number; caretTop: number; caretBottom: number };
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // Touch-tap bookkeeping for the rows: where the finger landed and whether
  // the list was momentum-scrolling at that moment (see the row handlers).
  const touchTap = useRef<{ x: number; y: number; scrolling: boolean } | null>(
    null,
  );
  const lastScrollTs = useRef(0);
  // Body-portaled with `position: fixed` so the panel never contributes
  // scrollable overflow to an ancestor — absolutely positioned inside the
  // editor wrapper it widened the fullscreen modal's scroll area, and the
  // browser's caret auto-scroll then dragged the whole prompt sideways.
  // Opens above the caret by default, flipped below when space is short.
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    maxHeight?: number;
  } | null>(null);

  useLayoutEffect(() => {
    const panel = listRef.current;
    if (!panel) return;

    // Bound placement to the VISUAL viewport. With the on-screen keyboard
    // up, window.innerHeight still spans the keyboard-covered / scrolled-away
    // area, so clamping against it parked the panel above the visible screen
    // (users had to scroll up to find it).
    const vv = window.visualViewport;
    const vpTop = vv?.offsetTop ?? 0;
    const vpLeft = vv?.offsetLeft ?? 0;
    const vpHeight = vv?.height ?? window.innerHeight;
    const vpWidth = vv?.width ?? window.innerWidth;

    const panelWidth = panel.offsetWidth;
    // scrollHeight, not offsetHeight: offsetHeight reflects a maxHeight this
    // effect previously applied, which would feed back into the next measure.
    const naturalHeight = Math.min(panel.scrollHeight + 2, DROPDOWN_MAX_HEIGHT);

    const left = Math.max(
      vpLeft + DROPDOWN_MARGIN,
      Math.min(position.left, vpLeft + vpWidth - panelWidth - DROPDOWN_MARGIN),
    );

    const spaceAbove = position.caretTop - vpTop - DROPDOWN_MARGIN;
    const spaceBelow =
      vpTop + vpHeight - position.caretBottom - DROPDOWN_MARGIN;

    // Shrink the panel to the space on its side of the caret rather than
    // letting it overflow the visible area (it scrolls internally).
    let top: number;
    let maxHeight: number | undefined;
    if (naturalHeight > spaceAbove && spaceBelow > spaceAbove) {
      top = position.caretBottom + 4;
      if (naturalHeight > spaceBelow) {
        maxHeight = Math.max(DROPDOWN_MIN_HEIGHT, spaceBelow);
      }
    } else {
      const height = Math.min(
        naturalHeight,
        Math.max(DROPDOWN_MIN_HEIGHT, spaceAbove),
      );
      if (height < naturalHeight) maxHeight = height;
      top = Math.max(vpTop + DROPDOWN_MARGIN, position.caretTop - height - 4);
    }

    setPlacement({ left, top, maxHeight });
  }, [position, items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeItem = list.children[1]?.children[activeIndex] as HTMLElement;
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return createPortal(
    <div
      ref={listRef}
      // `data-modal-outside-safe` tells the shared Modal (focus mode) that
      // clicks here are not outside clicks; `pointerEvents: auto` re-enables
      // interaction under the Radix modal's body-wide pointer-events lock.
      data-modal-outside-safe=""
      // Lets the editor's blur handler recognize focus moving into this
      // panel (Android taps focus the row button before click fires).
      data-mention-dropdown=""
      // The focus-mode modal's scroll lock (react-remove-scroll) blocks any
      // wheel/touch event that bubbles to document from outside the dialog —
      // and this panel is body-portaled, so it counts as outside. Stopping
      // propagation here keeps the list's native scrolling working.
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onScroll={() => (lastScrollTs.current = performance.now())}
      className="fixed z-[9999] w-64 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-[3px] border border-ui-panel-border bg-ui-panel p-1 shadow-xl"
      style={{
        pointerEvents: "auto",
        ...(placement
          ? {
              left: placement.left,
              top: placement.top,
              ...(placement.maxHeight != null
                ? { maxHeight: placement.maxHeight }
                : {}),
            }
          : {
              left: position.left,
              top: position.caretBottom + 4,
              visibility: "hidden",
            }),
      }}
    >
      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-base-fg/50">
        References
      </div>
      <div>
        {items.map((item, i) => (
          <button
            key={item.token ?? `${item.label}-${i}`}
            type="button"
            className={twMerge(
              "flex w-full items-center gap-2 rounded-[3px] px-2 py-2 text-sm text-base-fg transition-colors cursor-pointer",
              i === activeIndex
                ? "bg-ui-controls/80"
                : "hover:bg-ui-controls/60",
            )}
            // Selection happens on pointerup, not click: on mobile the
            // editor's blur (which closes this panel) fires BETWEEN pointerup
            // and click, so a click handler never runs — the tap just closed
            // the panel. pointerup fires before any blur. Scrolling stays
            // safe: once the browser claims the gesture for scrolling it
            // fires pointercancel instead of pointerup.
            onPointerDown={(e) => {
              if (e.pointerType === "mouse") {
                // Keeps the editor focused so its blur never fires.
                e.preventDefault();
                return;
              }
              // Touch must pass through untouched (preventDefault would
              // block scrolling). Record the landing point, and whether the
              // list was momentum-scrolling — a tap that merely stops the
              // glide must not select.
              touchTap.current = {
                x: e.clientX,
                y: e.clientY,
                scrolling: performance.now() - lastScrollTs.current < 100,
              };
            }}
            onPointerUp={(e) => {
              if (e.pointerType === "mouse") {
                onSelect(item);
                return;
              }
              const start = touchTap.current;
              touchTap.current = null;
              if (!start || start.scrolling) return;
              // Implicit touch capture keeps pointerup on this row even if
              // the finger slid without panning — require a genuine tap.
              if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) {
                return;
              }
              onSelect(item);
            }}
            onPointerCancel={() => (touchTap.current = null)}
            // Assistive-tech activation can dispatch click without pointer
            // events; after a pointerup selection the panel unmounts before
            // the click task, so this can't double-fire.
            onClick={() => onSelect(item)}
            onMouseEnter={() => onHover(i)}
          >
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden border border-white/10 flex items-center justify-center bg-black/20">
              {item.type === "character" && item.preview ? (
                <img
                  src={item.preview}
                  alt={item.label}
                  className="h-full w-full object-cover"
                />
              ) : item.type === "character" ? (
                <UserIcon className="h-3.5 w-3.5 text-base-fg/60" />
              ) : item.type === "image" && item.preview ? (
                <img
                  src={item.preview}
                  alt={item.label}
                  className="h-full w-full object-cover"
                />
              ) : item.type === "video" && item.preview ? (
                <video
                  src={item.preview}
                  muted
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <DynamicIcon
                  icon={item.type === "video" ? VideoIcon : MusicIcon}
                  className="h-3.5 w-3.5 text-base-fg/60"
                />
              )}
            </div>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

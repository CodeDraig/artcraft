import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import galleryDnd from "./galleryDnd";
import { galleryModalLightboxVisible } from "./galleryModalSignals";

export function useGalleryMarquee(
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  bulkSelectedIds: Set<string>,
  setBulkSelectedIds: Dispatch<SetStateAction<Set<string>>>,
) {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeRaf = useRef(0);
  // ── Marquee (drag) selection ──────────────────────────────────────────
  // Dragging from blank background draws a selection rectangle; tiles it
  // covers are added to the bulk selection (additive to whatever was
  // selected on start). Ported from the webapp library page, scoped to the
  // modal's scroll container. Perf-sensitive: the rectangle is positioned
  // imperatively, tile rects are cached at drag start, and selection commits
  // only when the covered set actually changes.
  const handleMarqueePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || galleryModalLightboxVisible.value) return;
      // A per-tile drag (to a folder / the canvas) is already underway —
      // never start a marquee on top of it.
      if (galleryDnd.getDragState().isDragging) return;

      const target = e.target as HTMLElement;
      // Start only on blank background — never from tiles, folder cards,
      // controls, or opted-out chrome.
      if (
        target.closest(
          "[data-media-id], [data-folder-id], button, a, input, [data-no-marquee]",
        )
      ) {
        return;
      }
      const scroller = scrollContainerRef.current;
      if (!scroller) return;

      // Blank-background press: suppress the browser's native text-selection
      // default so it can't hijack the marquee drag.
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      // No marquee on touch — a finger drag should scroll. A still tap on
      // blank space still clears the selection below.
      const isTouch = e.pointerType !== "mouse";
      const base = new Set(bulkSelectedIds);
      let applied = base;
      let active = false;

      const readScrollTop = () => scroller.scrollTop;
      const readScrollLeft = () => scroller.scrollLeft;
      const startScrollTop = readScrollTop();
      const startScrollLeft = readScrollLeft();
      let lastCx = startX;
      let lastCy = startY;
      let edgeRaf = 0;

      let tiles: {
        id: string;
        left: number;
        top: number;
        right: number;
        bottom: number;
      }[] = [];
      const cacheTiles = () => {
        tiles = [];
        scroller
          .querySelectorAll<HTMLElement>("[data-media-id]")
          .forEach((el) => {
            const id = el.dataset.mediaId;
            if (!id) return;
            const r = el.getBoundingClientRect();
            tiles.push({
              id,
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
            });
          });
      };
      if (!isTouch) cacheTiles();

      const applyMarquee = (cx: number, cy: number) => {
        // Compensate the anchor for scrolling since drag start so the
        // rectangle keeps growing in content space, not viewport space.
        const ax = startX - (readScrollLeft() - startScrollLeft);
        const ay = startY - (readScrollTop() - startScrollTop);
        const left = Math.min(ax, cx);
        const top = Math.min(ay, cy);
        const width = Math.abs(cx - ax);
        const height = Math.abs(cy - ay);
        const right = left + width;
        const bottom = top + height;
        const box = marqueeRef.current;
        if (box) {
          // Clamp the *visible* rectangle to the scroll viewport so it never
          // paints over the modal header / sidebar. Selection math below
          // uses the unclamped rect, so tiles scrolled out of view stay
          // selected.
          const vr = scroller.getBoundingClientRect();
          const dispLeft = Math.max(left, vr.left);
          const dispRight = Math.min(right, vr.right);
          const dispTop = Math.max(top, vr.top);
          const dispBottom = Math.min(bottom, vr.bottom);
          box.style.display = "block";
          box.style.left = `${dispLeft}px`;
          box.style.top = `${dispTop}px`;
          box.style.width = `${Math.max(0, dispRight - dispLeft)}px`;
          box.style.height = `${Math.max(0, dispBottom - dispTop)}px`;
        }
        const mounted = new Set(tiles.map((t) => t.id));
        const next = new Set(base);
        // Tiles swept over earlier may have unmounted (virtualized list)
        // once scrolled far away — keep them selected.
        for (const id of applied) {
          if (!base.has(id) && !mounted.has(id)) next.add(id);
        }
        for (const t of tiles) {
          if (
            t.left < right &&
            t.right > left &&
            t.top < bottom &&
            t.bottom > top
          ) {
            next.add(t.id);
          }
        }
        // Commit only when coverage changed — most frames it hasn't.
        let changed = next.size !== applied.size;
        if (!changed) {
          for (const id of next) {
            if (!applied.has(id)) {
              changed = true;
              break;
            }
          }
        }
        if (changed) {
          applied = next;
          setBulkSelectedIds(next);
        }
      };

      // Auto-scroll while the cursor sits within EDGE px of the scroller's
      // top or bottom; speed ramps up nearer the edge. Self-perpetuating
      // via rAF until the cursor leaves the zone or the drag ends.
      const EDGE = 64;
      const MAX_SPEED = 24;
      const autoScrollTick = () => {
        edgeRaf = 0;
        if (!active || isTouch) return;
        const r = scroller.getBoundingClientRect();
        let dy = 0;
        if (lastCy < r.top + EDGE) {
          dy = -Math.min(MAX_SPEED, Math.ceil((r.top + EDGE - lastCy) / 3));
        } else if (lastCy > r.bottom - EDGE) {
          dy = Math.min(MAX_SPEED, Math.ceil((lastCy - (r.bottom - EDGE)) / 3));
        }
        if (dy === 0) return;
        scroller.scrollTop += dy;
        cacheTiles();
        applyMarquee(lastCx, lastCy);
        edgeRaf = requestAnimationFrame(autoScrollTick);
      };
      const ensureAutoScroll = () => {
        if (!edgeRaf) edgeRaf = requestAnimationFrame(autoScrollTick);
      };

      const handleMove = (ev: PointerEvent) => {
        if (isTouch) return;
        if (!active) {
          // Small threshold so plain background clicks don't flash a marquee.
          if (
            Math.abs(ev.clientX - startX) < 5 &&
            Math.abs(ev.clientY - startY) < 5
          ) {
            return;
          }
          active = true;
          document.body.style.userSelect = "none";
        }
        lastCx = ev.clientX;
        lastCy = ev.clientY;
        ensureAutoScroll();
        cancelAnimationFrame(marqueeRaf.current);
        marqueeRaf.current = requestAnimationFrame(() =>
          applyMarquee(ev.clientX, ev.clientY),
        );
      };
      const handleScroll = () => {
        if (active && !isTouch) {
          cacheTiles();
          applyMarquee(lastCx, lastCy);
        }
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("scroll", handleScroll, true);
        cancelAnimationFrame(marqueeRaf.current);
        cancelAnimationFrame(edgeRaf);
        document.body.style.userSelect = "";
        if (marqueeRef.current) marqueeRef.current.style.display = "none";
        // Plain click on blank background (no marquee drawn) clears the
        // selection, like clicking the desktop on an OS.
        if (!active) {
          setBulkSelectedIds(new Set());
        }
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("scroll", handleScroll, true);
    },
    [bulkSelectedIds, scrollContainerRef, setBulkSelectedIds],
  );

  return { marqueeRef, handleMarqueePointerDown };
}

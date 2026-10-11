import { ReactNode, useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { InfoIcon } from "lucide-react";

// Small (i) info affordance for list rows. Opens on hover (desktop) and
// toggles on click/tap (works on touch devices). Rendered into a portal so it
// is never clipped by the popover panel's bounds.
export function InfoHint({ content }: { content: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pinnedRef = useRef(false); // opened via click/tap (sticky until dismissed)
  const [position, setPosition] = useState({ top: 0, left: 0, maxWidth: 320 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Clamp horizontally so the (centered) bubble never overflows the viewport
    // — important on narrow / mobile screens.
    const margin = 8;
    const vw = window.innerWidth;
    const maxWidth = Math.min(320, vw - margin * 2);
    const half = maxWidth / 2;
    const center = rect.left + rect.width / 2;
    const left = Math.max(margin + half, Math.min(center, vw - margin - half));
    // Anchor above the icon; the bubble is translated up by its own height.
    setPosition({ top: rect.top - 8, left, maxWidth });
  }, []);

  const close = useCallback(() => {
    pinnedRef.current = false;
    setOpen(false);
  }, []);

  // While open, reposition on scroll and dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onPointerDown = (e: MouseEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, updatePosition]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="More info"
        className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center text-base-fg/40 transition-colors hover:text-base-fg/80"
        onClick={(e) => {
          // Don't let the click select the row.
          e.stopPropagation();
          e.preventDefault();
          if (open && pinnedRef.current) {
            close();
          } else {
            pinnedRef.current = true;
            updatePosition();
            setOpen(true);
          }
        }}
        onMouseEnter={() => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = setTimeout(() => {
            updatePosition();
            setOpen(true);
          }, 150);
        }}
        onMouseLeave={() => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          if (!pinnedRef.current) setOpen(false);
        }}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            // Body-portaled, so inside a Radix modal (promptbox focus mode)
            // taps here must not count as outside clicks on the dialog.
            data-modal-outside-safe=""
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              maxWidth: position.maxWidth,
              transform: "translate(-50%, -100%)",
              zIndex: 10000,
            }}
            className="pointer-events-auto rounded-[3px] border border-ui-panel-border bg-ui-controls px-3 py-1.5 text-center text-xs leading-relaxed text-base-fg"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            }}
            onMouseLeave={() => {
              if (!pinnedRef.current) setOpen(false);
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

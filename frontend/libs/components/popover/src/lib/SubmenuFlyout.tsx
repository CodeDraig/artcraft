import {
  ReactNode,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type { PopoverItem } from "./PopoverItem";
import { RichListRow } from "./RichListRow";
import { PortalTooltip } from "./PortalTooltip";

interface SubmenuFlyoutProps {
  children: React.ReactElement;
  item: PopoverItem;
  onSelectChild: (child: PopoverItem) => void;
  // The enclosing popover's close, threaded into children's hoverTooltip
  // render functions (e.g. the provider selector) so they can close everything.
  popoverClose: () => void;
  onOpenChange?: (open: boolean) => void;
}

// Right-side flyout submenu for grouped model rows. Portal-rendered so it
// escapes the panel bounds, opens on hover or click (the click path doubles as
// the touch fallback), and hides when its row scrolls out of the list.
export function SubmenuFlyout({
  children,
  item,
  onSelectChild,
  popoverClose,
  onOpenChange,
}: SubmenuFlyoutProps) {
  const [isShowing, setIsShowingRaw] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeChildIdx, setActiveChildIdx] = useState<number | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const childTooltipRefs = useRef(new Map<number, HTMLDivElement>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateScrollIndicators = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setCanScrollUp(scrollTop > 1);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
  }, []);

  const setIsShowing = useCallback(
    (show: boolean) => {
      setIsShowingRaw(show);
      onOpenChange?.(show);
    },
    [onOpenChange],
  );

  // Position the flyout beside the trigger row. Returns false (without
  // positioning) when the row is scrolled out of its list.
  const updatePosition = useCallback((): boolean => {
    const trigger = triggerRef.current;
    if (!trigger) return false;
    const rect = trigger.getBoundingClientRect();
    const scrollParent = trigger.closest("[data-scroll-container]");
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const inView =
        rect.top >= parentRect.top - 10 &&
        rect.bottom <= parentRect.bottom + 10;
      if (!inView) return false;
    }
    setPosition({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    return true;
  }, []);

  const cancelTimers = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const scheduleOpen = () => {
    cancelTimers();
    openTimerRef.current = setTimeout(() => {
      if (updatePosition()) setIsShowing(true);
    }, 100);
  };

  const scheduleClose = () => {
    cancelTimers();
    closeTimerRef.current = setTimeout(() => setIsShowing(false), 150);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  useEffect(() => cancelTimers, []);

  // Open with the selected model centered in the flyout's own scroll list so
  // the current choice is visible without scrolling.
  useLayoutEffect(() => {
    if (!isShowing) return;
    const container = scrollRef.current;
    if (!container) return;
    const selected = container.querySelector(
      "[data-selected='true']",
    ) as HTMLElement | null;
    if (selected) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = selected.getBoundingClientRect();
      const relativeTop =
        elementRect.top - containerRect.top + container.scrollTop;
      container.scrollTop = Math.max(
        0,
        relativeTop - containerRect.height / 2 + elementRect.height / 2,
      );
    }
    updateScrollIndicators();
  }, [isShowing, updateScrollIndicators]);

  // Keep the scroll fades in sync while the flyout is open.
  useEffect(() => {
    if (!isShowing) return;
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateScrollIndicators);
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(container);
    return () => {
      container.removeEventListener("scroll", updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [isShowing, updateScrollIndicators]);

  // The flyout is vertically centered on its row; clamp it into the viewport
  // when a long list would run off the top or bottom edge.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!isShowing || !el) return;
    el.style.transform = "translateY(-50%)";
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let dy = 0;
    if (rect.bottom > window.innerHeight - margin) {
      dy = window.innerHeight - margin - rect.bottom;
    }
    if (rect.top + dy < margin) dy = margin - rect.top;
    if (dy !== 0) el.style.transform = `translateY(calc(-50% + ${dy}px))`;
  }, [isShowing, position]);

  // Track the row while scrolling; hide once it leaves the list viewport.
  useEffect(() => {
    if (!isShowing) return;
    const handleScroll = () => {
      if (!updatePosition()) setIsShowing(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isShowing, updatePosition, setIsShowing]);

  // Dismiss on outside press — needed for the click/touch open path, where
  // there is no hover-out to close the flyout. Escape also dismisses: the
  // outside-safe marker on the panel makes the enclosing Modal defer its own
  // Escape handling while the flyout is open.
  useEffect(() => {
    if (!isShowing) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      // Provider pickers are body portals, but still belong to this submenu.
      // Keep them mounted through the press so their click can select a model
      // and provider before closing the popover.
      for (const tooltip of childTooltipRefs.current.values()) {
        if (tooltip.contains(target)) return;
      }
      setIsShowing(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsShowing(false);
    };
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [isShowing, setIsShowing]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onClick={() => {
          cancelTimers();
          if (isShowing) {
            setIsShowing(false);
          } else if (updatePosition()) {
            setIsShowing(true);
          }
        }}
      >
        {children}
      </div>
      {isShowing &&
        createPortal(
          <div
            ref={panelRef}
            // Body-portaled: a modal Radix dialog (promptbox focus mode) sets
            // pointer-events: none on <body>, so re-enable them explicitly or
            // the flyout can never be hovered and closes on row mouse-leave.
            // The outside-safe marker keeps clicks in here from counting as
            // outside clicks that would close the dialog.
            data-modal-outside-safe=""
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            // The focus-mode modal's scroll lock (react-remove-scroll) blocks
            // any wheel/touch event that bubbles to document from outside the
            // dialog — and this body-portaled panel counts as outside. Stop
            // propagation so the list's native scrolling keeps working.
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              transform: "translateY(-50%)",
              zIndex: 9999,
            }}
            className="pointer-events-auto w-[340px] rounded-[3px] border border-ui-panel-border bg-ui-controls p-1.5 text-base-fg"
          >
            <div className="mb-1 mt-0.5 px-1.5 text-sm font-normal text-base-fg opacity-70">
              {item.label}
            </div>
            <div className="relative">
              {/* Top fade — appears only when there's content above, with a
                  slow bouncing arrow hinting to scroll up. */}
              <div
                className={twMerge(
                  "pointer-events-none absolute inset-x-0 top-0 z-20 flex h-10 items-start justify-center bg-gradient-to-b from-ui-controls to-transparent pt-1 transition-opacity duration-200",
                  canScrollUp ? "opacity-100" : "opacity-0",
                )}
              >
                <ChevronUpIcon className="animate-bounce text-sm text-base-fg/60 drop-shadow [animation-duration:1.1s]" />
              </div>
              <div
                ref={scrollRef}
                data-scroll-container
                className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto text-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {item.subItems?.map((child, childIdx) => {
                  const childRow = (
                    <RichListRow
                      item={child}
                      onClick={() => onSelectChild(child)}
                      active={activeChildIdx === childIdx}
                    />
                  );
                  if (!child.hoverTooltip) {
                    return <div key={childIdx}>{childRow}</div>;
                  }
                  const childTooltip =
                    typeof child.hoverTooltip === "function"
                      ? (
                          child.hoverTooltip as (close: () => void) => ReactNode
                        )(popoverClose)
                      : child.hoverTooltip;
                  return (
                    <div key={childIdx}>
                      <PortalTooltip
                        content={childTooltip}
                        portalRef={(element) => {
                          if (element) {
                            childTooltipRefs.current.set(childIdx, element);
                          } else {
                            childTooltipRefs.current.delete(childIdx);
                          }
                        }}
                        delay={child.tooltipDelayMs ?? 300}
                        className="min-w-48"
                        onOpenChange={(open) =>
                          setActiveChildIdx((prev) =>
                            open ? childIdx : prev === childIdx ? null : prev,
                          )
                        }
                      >
                        {childRow}
                      </PortalTooltip>
                    </div>
                  );
                })}
              </div>
              {/* Bottom fade — appears only when there's more below, with a
                  slow bouncing arrow hinting to scroll down. */}
              <div
                className={twMerge(
                  "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-10 items-end justify-center bg-gradient-to-t from-ui-controls to-transparent pb-1 transition-opacity duration-200",
                  canScrollDown ? "opacity-100" : "opacity-0",
                )}
              >
                <ChevronDownIcon className="animate-bounce text-sm text-base-fg/60 drop-shadow [animation-duration:1.1s]" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

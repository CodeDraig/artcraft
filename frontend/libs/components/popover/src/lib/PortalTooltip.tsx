import { ReactNode, useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

interface PortalTooltipProps {
  children: React.ReactElement;
  content: ReactNode;
  delay?: number;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  portalRef?: (element: HTMLDivElement | null) => void;
}

export function PortalTooltip({
  children,
  content,
  delay = 300,
  className,
  onOpenChange,
  portalRef,
}: PortalTooltipProps) {
  const [isShowing, setIsShowing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkVisibilityAndUpdatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    const scrollParent = triggerRef.current.closest("[data-scroll-container]");
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const isInView =
        rect.top >= parentRect.top - 10 &&
        rect.bottom <= parentRect.bottom + 10;
      setIsVisible(isInView);
      if (!isInView) return;
    }

    setPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  }, []);

  useEffect(() => {
    const shouldShow = isHoveringTrigger || isHoveringTooltip;
    if (shouldShow) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      checkVisibilityAndUpdatePosition();
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = setTimeout(() => setIsShowing(true), delay);
    } else {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = setTimeout(() => setIsShowing(false), 150);
    }
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [
    isHoveringTrigger,
    isHoveringTooltip,
    delay,
    checkVisibilityAndUpdatePosition,
  ]);

  useEffect(() => {
    onOpenChange?.(isShowing && isVisible);
  }, [isShowing, isVisible, onOpenChange]);

  useEffect(() => {
    if (!isShowing) return;
    const handleScroll = () => checkVisibilityAndUpdatePosition();
    // Escape dismisses the tooltip — required because the outside-safe marker
    // below makes the enclosing Modal defer its own Escape handling to us.
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      setIsShowing(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKey);
    };
  }, [isShowing, checkVisibilityAndUpdatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsHoveringTrigger(true)}
        onMouseLeave={() => setIsHoveringTrigger(false)}
      >
        {children}
      </div>
      {isShowing &&
        isVisible &&
        createPortal(
          <div
            ref={portalRef}
            // Body-portaled, so inside a Radix modal (promptbox focus mode)
            // clicks here must not count as outside clicks on the dialog.
            data-modal-outside-safe=""
            onMouseEnter={() => setIsHoveringTooltip(true)}
            onMouseLeave={() => setIsHoveringTooltip(false)}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              transform: "translateY(-50%)",
              zIndex: 9999,
            }}
            className={twMerge(
              "pointer-events-auto rounded-[3px] bg-ui-controls p-3 border border-ui-panel-border text-base-fg",
              className,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

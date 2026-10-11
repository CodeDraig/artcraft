import React, { useEffect, useRef, useState } from "react";
// ─── Lazy date-group virtualization ───────────────────────────────────────────
// Bidirectional: mounts groups when they scroll within 800px of the viewport,
// and unmounts them when they scroll beyond that range. Measured heights are
// used for placeholders so scroll position stays rock-solid.

export interface LazyDateGroupProps {
  /** If true the group renders on mount (use for first N visible groups). */
  eager: boolean;
  /** Estimated item count for placeholder height calculation. */
  itemCount: number;
  /** Current grid column count, used to estimate placeholder height. */
  gridColumns: number;
  /** The scroll container used as IntersectionObserver root. */
  scrollRoot: HTMLDivElement | null;
  children: React.ReactNode;
}

export const LazyDateGroup = React.memo(
  ({
    eager,
    itemCount,
    gridColumns,
    scrollRoot,
    children,
  }: LazyDateGroupProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isNearViewport, setIsNearViewport] = useState(eager);
    // Store the last measured height so placeholders match exactly
    const measuredHeightRef = useRef<number | null>(null);

    // Measure rendered height on every commit while visible
    useEffect(() => {
      if (isNearViewport && containerRef.current) {
        measuredHeightRef.current = containerRef.current.offsetHeight;
      }
    });

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsNearViewport(entry.isIntersecting);
        },
        {
          root: scrollRoot,
          rootMargin: "800px 0px", // mount/unmount buffer
        },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [scrollRoot]);

    if (!isNearViewport) {
      // Use measured height if available, otherwise estimate
      const height =
        measuredHeightRef.current ??
        Math.ceil(itemCount / gridColumns) * 120 + 36;
      return (
        <div
          ref={containerRef}
          style={{ height, minHeight: height }}
          aria-hidden
        />
      );
    }

    return <div ref={containerRef}>{children}</div>;
  },
);
LazyDateGroup.displayName = "LazyDateGroup";

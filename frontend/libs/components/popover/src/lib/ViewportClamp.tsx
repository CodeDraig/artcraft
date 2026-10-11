import { useLayoutEffect } from "react";

export const ViewportClamp = ({
  targetRef,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
}) => {
  useLayoutEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    el.style.visibility = "hidden";
    el.style.transform = "";
    let done = false;
    const clamp = () => {
      if (done || !el.isConnected) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const margin = 8;
      const vw = window.innerWidth;
      let dx = 0;
      if (rect.right > vw - margin) {
        dx = vw - margin - rect.right;
      } else if (rect.left < margin) {
        dx = margin - rect.left;
      }
      el.style.transform = dx !== 0 ? `translateX(${dx}px)` : "";
      el.style.visibility = "";
      done = true;
    };
    clamp();
    const raf = requestAnimationFrame(clamp);
    const onResize = () => {
      done = false;
      clamp();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [targetRef]);
  return null;
};

import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { EASE } from "./settingsMotion";

// Two-step destructive button: first click arms it (turns solid red), second
// click within the window commits. Blur, Escape, or a timeout disarm it —
// a nested confirm dialog inside the settings modal would be heavier than the
// action warrants, but a bare one-click wipe is how overrides get lost.
// `confirmDelayMs` adds a post-arm lockout during which clicks are swallowed,
// so a double-click can't arm-and-confirm in one motion; the auto-disarm
// window starts after the lockout ends. Both timers are made visible as
// background fills: the lockout charges red left→right, then the armed red
// drains right→left as the disarm clock runs out.
const DISARM_MS = 5000;

export function ConfirmResetButton({
  idleLabel,
  confirmLabel,
  title,
  prominent,
  confirmDelayMs = 0,
  onConfirm,
}: {
  idleLabel: string;
  confirmLabel: string;
  title: string;
  prominent?: boolean;
  confirmDelayMs?: number;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false); // lockout elapsed, click confirms
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const disarm = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    setArmed(false);
    setReady(false);
  };

  useEffect(() => disarm, []); // clear the pending timeouts on unmount

  const handleClick = () => {
    if (armed && !ready) return; // inside the lockout — swallow the click
    if (armed) {
      disarm();
      onConfirm();
    } else {
      setArmed(true);
      setReady(confirmDelayMs === 0);
      timers.current = [
        setTimeout(() => setReady(true), confirmDelayMs),
        setTimeout(disarm, confirmDelayMs + DISARM_MS),
      ];
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={disarm}
      onKeyDown={(e) => {
        // While armed, Escape cancels the confirm instead of closing the modal.
        if (e.key === "Escape" && armed) {
          e.stopPropagation();
          disarm();
        }
      }}
      title={title}
      aria-label={armed ? `${title} — click again to confirm` : title}
      className={twMerge(
        "relative shrink-0 overflow-hidden whitespace-nowrap rounded-[3px] font-medium transition-all active:scale-[0.97]",
        EASE,
        prominent ? "h-9 px-4 text-[13px]" : "h-7 px-2.5 text-[12px]",
        armed
          ? ready
            ? "bg-red/25 text-white shadow-[0_0_0_3px_rgba(0,0,0,0.15)]"
            : "cursor-wait bg-white/[0.06] text-base-fg/55 ring-1 ring-white/15"
          : prominent
            ? "bg-red/10 text-red ring-1 ring-red/30 hover:bg-red/[0.18]"
            : "text-base-fg/45 hover:bg-red/10 hover:text-red",
      )}
    >
      {/* Timer made visible: lockout charges toward armed, then the armed red
          drains as the auto-disarm clock runs out. Keyed so each phase gets a
          fresh transition. */}
      {armed &&
        (ready ? (
          <TimedFill
            key="drain"
            from={1}
            to={0}
            durationMs={DISARM_MS}
            className="bg-red"
          />
        ) : (
          <TimedFill
            key="charge"
            from={0}
            to={1}
            durationMs={confirmDelayMs}
            className="bg-red/40"
          />
        ))}
      <span className="relative">{armed ? confirmLabel : idleLabel}</span>
    </button>
  );
}

// A full-bleed background layer that linearly scales between two widths —
// progress-bar duty for ConfirmResetButton's lockout/disarm clocks. The
// double-rAF ensures the browser paints the `from` state before the
// transition to `to` engages.
function TimedFill({
  from,
  to,
  durationMs,
  className,
}: {
  from: number;
  to: number;
  durationMs: number;
  className?: string;
}) {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    let inner: number | undefined;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEngaged(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner !== undefined) cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <span
      aria-hidden="true"
      className={twMerge(
        "pointer-events-none absolute inset-0 origin-left",
        className,
      )}
      style={{
        transform: `scaleX(${engaged ? to : from})`,
        transition: `transform ${durationMs}ms linear`,
      }}
    />
  );
}

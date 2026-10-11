import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { PRESETS } from "../presets";
import { PresetId } from "../types";
import { EASE } from "./settingsMotion";
import { ChevronIcon, CheckIcon } from "./KeybindSettingsIcons";

const PRESET_ORDER: PresetId[] = ["gamer", "blender"];

// ── Preset dropdown ───────────────────────────────────────────────────────────

export function PresetDropdown({
  value,
  onChange,
}: {
  value: PresetId;
  onChange: (id: PresetId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const def = PRESETS[value];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={twMerge(
          "flex w-full items-center gap-3 rounded-none bg-white/[0.04] p-1.5 text-left ring-1 ring-white/15 transition-all hover:bg-white/[0.06] active:scale-[0.995]",
          EASE,
          open && "ring-primary/40",
        )}
      >
        <div className="flex min-w-0 grow flex-col gap-0.5 px-3 py-1.5">
          <span className="text-sm font-medium text-base-fg">{def.label}</span>
          <span className="text-[12px] leading-relaxed text-base-fg/60">
            {def.description}
          </span>
        </div>
        <ChevronIcon
          className={twMerge(
            "mr-3 h-4 w-4 shrink-0 text-base-fg/40 transition-transform duration-300",
            EASE,
            open ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>

      <div
        role="listbox"
        aria-label="Preset"
        className={twMerge(
          "absolute left-0 right-0 top-full z-20 mt-2 origin-top rounded-none bg-ui-modal shadow-[0_20px_50px_-16px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-all duration-200 overflow-hidden",
          EASE,
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {PRESET_ORDER.map((id) => {
          const p = PRESETS[id];
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={twMerge(
                "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                EASE,
                selected ? "bg-primary/[0.08]" : "hover:bg-white/[0.04]",
              )}
            >
              <span
                className={twMerge(
                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-white transition-all",
                  selected ? "bg-primary opacity-100" : "opacity-0",
                )}
              >
                <CheckIcon className="h-2.5 w-2.5" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-base-fg">
                  {p.label}
                </span>
                <span className="text-[12px] leading-relaxed text-base-fg/55">
                  {p.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LayeringNote({ preset }: { preset: PresetId }) {
  return (
    <p className="text-[13px] leading-relaxed text-base-fg/55">
      Every shortcut starts from the{" "}
      <span className="font-medium text-base-fg/80">
        {PRESETS[preset].label}
      </span>{" "}
      preset. Any key you change is saved as your own{" "}
      <span className="font-medium text-base-fg/80">override</span> on top —
      these sit beside the dimmed preset default
      <span className="mx-1 inline-block h-1.5 w-1.5 translate-y-px rounded-full bg-primary align-middle" />
      and revert with ↺.
    </p>
  );
}

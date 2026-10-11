import { twMerge } from "tailwind-merge";
import { ActionDef, Binding } from "../types";
import { KbdBindings } from "../components/Kbd";
import { KeybindCaptureInput } from "../components/KeybindCaptureInput";
import { EASE } from "./settingsMotion";
import { ResetIcon } from "./KeybindSettingsIcons";

// ── Rows ──────────────────────────────────────────────────────────────────────

export function ActionRow({
  action,
  bindings,
  defaultBindings,
  overridden,
  onCapture,
  onReset,
}: {
  action: ActionDef;
  bindings: Binding[];
  defaultBindings: Binding[];
  overridden: boolean;
  onCapture: (binding: Binding) => void;
  onReset: () => void;
}) {
  return (
    <div
      className={twMerge(
        "group/row flex items-center gap-3 rounded-[3px] px-3 py-2 transition-colors",
        EASE,
        "hover:bg-white/[0.03]",
      )}
    >
      <span
        className={twMerge(
          "h-1.5 w-1.5 shrink-0 rounded-full bg-primary transition-opacity duration-300",
          overridden ? "opacity-100" : "opacity-0",
        )}
        title={overridden ? "Customized" : undefined}
      />
      <span className="grow truncate text-[13px] text-base-fg/90">
        {action.label}
      </span>

      {/* Layering made literal: dimmed preset default → revert → live override. */}
      {overridden && (
        <span
          className="hidden items-center gap-1.5 text-xs text-base-fg/35 opacity-70 sm:inline-flex"
          title="Preset default"
        >
          <KbdBindings bindings={defaultBindings} />
        </span>
      )}
      {overridden && (
        <button
          type="button"
          onClick={onReset}
          title="Revert to preset default"
          aria-label="Revert to preset default"
          className={twMerge(
            "grid h-7 w-7 shrink-0 place-items-center rounded-[3px] text-base-fg/40 transition-all hover:bg-white/10 hover:text-base-fg active:scale-90",
            EASE,
          )}
        >
          <ResetIcon className="h-3.5 w-3.5" />
        </button>
      )}
      <KeybindCaptureInput
        bindings={bindings}
        accent={overridden}
        onCapture={onCapture}
      />
    </div>
  );
}

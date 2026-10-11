import { twMerge } from "tailwind-merge";
import { EASE } from "./settingsMotion";
import { ConfirmResetButton } from "./ConfirmResetButton";
import { ChevronIcon } from "./KeybindSettingsIcons";

// ── Sections ──────────────────────────────────────────────────────────────────

export function CollapsibleSurface({
  title,
  hint,
  count,
  overriddenCount,
  open,
  locked,
  onToggle,
  onReset,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  overriddenCount: number;
  open: boolean;
  locked: boolean;
  onToggle: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-none bg-white/[0.04] ring-1 ring-white/15">
      <div className="overflow-hidden rounded-[3px] bg-ui-modal/40">
        {/* The toggle and the (destructive) section reset are sibling buttons —
            a nested button is invalid HTML and a mis-click on "reset" must
            never also collapse the section. */}
        <div className="flex w-full items-center gap-3 pr-4">
          <button
            type="button"
            onClick={locked ? undefined : onToggle}
            aria-expanded={open}
            disabled={locked}
            className={twMerge(
              "flex min-w-0 grow items-center gap-3 py-3 pl-4 text-left transition-colors",
              EASE,
              locked ? "cursor-default" : "hover:bg-white/[0.03]",
            )}
          >
            <ChevronIcon
              className={twMerge(
                "h-4 w-4 shrink-0 text-base-fg/40 transition-transform duration-500",
                EASE,
                open && "rotate-90",
                locked && "opacity-40",
              )}
            />
            <div className="flex min-w-0 grow flex-col">
              <span className="truncate text-sm font-medium text-base-fg">
                {title}
              </span>
              <span className="truncate text-xs text-base-fg/40">{hint}</span>
            </div>
          </button>
          {overriddenCount > 0 && (
            <ConfirmResetButton
              idleLabel={`Reset ${overriddenCount}`}
              confirmLabel="Confirm?"
              title={`Reset ${title}'s ${overriddenCount} customized ${
                overriddenCount === 1 ? "binding" : "bindings"
              } to the preset defaults`}
              onConfirm={onReset}
            />
          )}
          <span className="shrink-0 rounded-[3px] bg-white/[0.06] px-2 py-0.5 text-xs tabular-nums text-base-fg/55">
            {count}
          </span>
        </div>

        {/* grid-rows 0fr→1fr gives a buttery height reveal without measuring. */}
        <div
          className={twMerge(
            "grid transition-[grid-template-rows] duration-500",
            EASE,
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="px-2 pb-2">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

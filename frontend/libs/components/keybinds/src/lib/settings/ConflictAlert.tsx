import { twMerge } from "tailwind-merge";
import { ACTIONS } from "../registry";
import { ActionId, Binding } from "../types";
import { KbdBindings } from "../components/Kbd";
import { EASE } from "./settingsMotion";

export interface PendingConflict {
  id: ActionId;
  binding: Binding;
  conflicts: ActionId[];
}

export function ConflictAlert({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingConflict;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2.5 rounded-none bg-red/[0.08] p-3.5 text-[13px] ring-1 ring-red/30"
    >
      <span className="leading-relaxed text-base-fg/80">
        <KbdBindings bindings={[pending.binding]} /> is already used by{" "}
        <strong className="font-medium text-base-fg">
          {pending.conflicts.map((c) => ACTIONS[c]?.label).join(", ")}
        </strong>
        .
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className={twMerge(
            "rounded-[3px] bg-red px-4 py-1.5 text-[13px] font-medium text-white transition-all hover:bg-red/85 active:scale-[0.97]",
            EASE,
          )}
        >
          Rebind anyway
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={twMerge(
            "rounded-[3px] bg-white/[0.06] px-4 py-1.5 text-[13px] text-base-fg/80 transition-all hover:bg-white/10 active:scale-[0.97]",
            EASE,
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

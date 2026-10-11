import { twMerge } from "tailwind-merge";
import { Binding } from "../types";
import { KbdBindings } from "../components/Kbd";
import { EASE } from "./settingsMotion";
import { SearchIcon, KeyIcon, ClearIcon } from "./KeybindSettingsIcons";

export type SearchMode = "name" | "key";

// ── Search fields ─────────────────────────────────────────────────────────────

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-[3px] bg-ui-modal/60 p-0.5">
      {(["name", "key"] as SearchMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={twMerge(
            "rounded-[3px] px-3 py-1.5 text-[12px] font-medium capitalize transition-all",
            EASE,
            mode === m
              ? "bg-white/10 text-base-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "text-base-fg/50 hover:text-base-fg/80",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export function NameSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={twMerge(
        "group flex grow items-center rounded-[3px] bg-ui-modal/60 ring-1 ring-transparent transition-all",
        EASE,
        "focus-within:bg-ui-modal/80 focus-within:ring-primary/50",
      )}
    >
      <SearchIcon className="ml-3 h-4 w-4 shrink-0 text-base-fg/35 transition-colors group-focus-within:text-primary" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name — “rotate”, “camera up”…"
        className="h-10 w-full bg-transparent px-3 text-sm text-base-fg placeholder:text-base-fg/35 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={twMerge(
            "mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-[3px] text-base-fg/40 transition-all hover:bg-white/10 hover:text-base-fg active:scale-90",
            EASE,
          )}
        >
          <ClearIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function KeySearchField({
  binding,
  listening,
  onArm,
  onClear,
}: {
  binding: Binding | null;
  listening: boolean;
  onArm: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className={twMerge(
        "flex grow items-center rounded-[3px] bg-ui-modal/60 ring-1 transition-all",
        EASE,
        listening ? "ring-primary/60" : "ring-transparent",
      )}
    >
      <button
        type="button"
        onClick={onArm}
        className="flex h-10 grow items-center gap-2 px-3 text-left"
      >
        <KeyIcon
          className={twMerge(
            "h-4 w-4 shrink-0",
            listening ? "text-primary" : "text-base-fg/35",
          )}
        />
        {listening ? (
          <span className="animate-pulse text-[13px] font-medium text-primary">
            Listening… press a shortcut
          </span>
        ) : binding ? (
          <span className="flex items-center gap-2 text-[13px] text-base-fg/60">
            <KbdBindings bindings={[binding]} />
            <span className="text-base-fg/35">— filtering by this key</span>
          </span>
        ) : (
          <span className="text-sm text-base-fg/35">
            Click, then press a shortcut to filter…
          </span>
        )}
      </button>
      {binding && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear key filter"
          className={twMerge(
            "mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-[3px] text-base-fg/40 transition-all hover:bg-white/10 hover:text-base-fg active:scale-90",
            EASE,
          )}
        >
          <ClearIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  mode,
  query,
  binding,
}: {
  mode: SearchMode;
  query: string;
  binding: Binding | null;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-none bg-white/[0.06] px-6 py-12 text-center ring-1 ring-white/15">
      {mode === "key" ? (
        <KeyIcon className="h-6 w-6 text-base-fg/25" />
      ) : (
        <SearchIcon className="h-6 w-6 text-base-fg/25" />
      )}
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-base-fg/60">
        Nothing is bound to
        {mode === "key" && binding ? (
          <KbdBindings bindings={[binding]} />
        ) : (
          <span className="font-medium text-base-fg/90">“{query}”</span>
        )}
        {mode === "key" ? " yet." : "."}
      </p>
    </div>
  );
}

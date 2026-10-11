import { useMemo, useState } from "react";
import { useKeybindsStore } from "../keybinds-store";
import { useResolvedKeybinds } from "../useResolvedKeybinds";
import { useKeybindCapture } from "../useKeybindCapture";
import { ACTIONS, ACTIONS_BY_SURFACE } from "../registry";
import { BASE_BINDINGS, PRESETS } from "../presets";
import { bindingsEqual } from "../matcher";
import { ActionDef, ActionId, Binding, PresetId, Surface } from "../types";
import { actionMatchesQuery, groupActions } from "./search";
import { SearchMode, ModeToggle, NameSearchField, KeySearchField, EmptyState } from "./KeybindSearchControls";
import { PresetDropdown, LayeringNote } from "./PresetDropdown";
import { CollapsibleSurface } from "./CollapsibleSurface";
import { ConfirmResetButton } from "./ConfirmResetButton";
import { ActionRow } from "./ActionRow";
import { PendingConflict, ConflictAlert } from "./ConflictAlert";
import { InfoIcon } from "./KeybindSettingsIcons";

const SURFACE_TITLES: Record<Surface, string> = {
  global: "Global",
  pagescene: "3D Editor",
  pagedraw: "2D Editor",
  moodboard: "Moodboard canvas",
  "moodboard-grid": "Moodboard grid",
};


const SURFACE_HINTS: Record<Surface, string> = {
  global: "App-wide — works on every page",
  pagescene: "Viewport camera, transforms & selection",
  pagedraw: "Vector canvas editing",
  moodboard: "Figma-style board tools",
  "moodboard-grid": "Board library, item viewer & presentation",
};


// The shared body of the Settings → Keybinds section. Rendered identically in
// the desktop and web settings shells. Dependency-free (no @storyteller/ui-*),
// styled with the app's tailwind tokens.
export function KeybindsSettings({
  onOpenVideoEditorShortcuts,
}: {
  onOpenVideoEditorShortcuts?: () => void;
}) {
  const selectedPreset = useKeybindsStore((s) => s.selectedPreset);
  const overrides = useKeybindsStore((s) => s.overrides);
  const setPreset = useKeybindsStore((s) => s.setPreset);
  const setBinding = useKeybindsStore((s) => s.setBinding);
  const resetAction = useKeybindsStore((s) => s.resetAction);
  const resetSurface = useKeybindsStore((s) => s.resetSurface);
  const resetAll = useKeybindsStore((s) => s.resetAll);
  const findConflicts = useKeybindsStore((s) => s.findConflicts);
  const { forAction } = useResolvedKeybinds();

  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [nameSearch, setNameSearch] = useState("");
  const [keyQuery, setKeyQuery] = useState<Binding | null>(null);
  const [listening, setListening] = useState(false); // key-mode capture armed
  const [pending, setPending] = useState<PendingConflict | null>(null);
  const [openSurfaces, setOpenSurfaces] = useState<Record<Surface, boolean>>({
    global: true,
    pagescene: true,
    pagedraw: false,
    moodboard: false,
    "moodboard-grid": false,
  });

  // Key-mode search listens for a literal shortcut, since "⇧D" can't be typed.
  useKeybindCapture({
    active: listening,
    onCapture: (b) => {
      setKeyQuery(b);
      setListening(false);
    },
    onCancel: () => setListening(false),
  });

  const surfaces = useMemo(
    () =>
      (Object.keys(SURFACE_TITLES) as Surface[]).filter(
        (s) => ACTIONS_BY_SURFACE[s].length > 0,
      ),
    [],
  );

  const query = nameSearch.trim().toLowerCase();
  const searchActive = searchMode === "key" ? keyQuery !== null : query !== "";

  // Filter + group every surface in one pass, by name OR by captured key. The
  // `forAction` identity changes whenever a binding does, so results stay live.
  const filtered = useMemo(() => {
    const matchAction = (a: ActionDef) =>
      searchMode === "key"
        ? !keyQuery || forAction(a.id).some((b) => bindingsEqual(b, keyQuery))
        : actionMatchesQuery(a, forAction(a.id), query);
    return surfaces.map((surface) => {
      const actions = ACTIONS_BY_SURFACE[surface].filter(matchAction);
      return { surface, groups: groupActions(actions), count: actions.length };
    });
  }, [surfaces, searchMode, query, keyQuery, forAction]);

  const totalMatches = filtered.reduce((n, s) => n + s.count, 0);
  const overriddenCount = Object.keys(overrides).length;
  const overriddenBySurface = useMemo(() => {
    const counts = {} as Record<Surface, number>;
    for (const id of Object.keys(overrides) as ActionId[]) {
      const surface = ACTIONS[id]?.surface;
      if (surface) counts[surface] = (counts[surface] ?? 0) + 1;
    }
    return counts;
  }, [overrides]);
  const allOpen = surfaces.every((s) => openSurfaces[s]);

  const switchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setListening(mode === "key" && !keyQuery); // auto-arm an empty key search
  };

  const clearKeyQuery = () => {
    setKeyQuery(null);
    setListening(true);
  };

  const applyBinding = (id: ActionId, binding: Binding) =>
    setBinding(id, [binding]);

  const handleCapture = (id: ActionId, binding: Binding) => {
    const conflicts = findConflicts(id, binding);
    if (conflicts.length) {
      setPending({ id, binding, conflicts });
    } else {
      applyBinding(id, binding);
    }
  };

  const confirmRebind = () => {
    if (!pending) return;
    // Take the key from the conflicting actions, then assign it here.
    for (const other of pending.conflicts) {
      const remaining = forAction(other).filter(
        (b) => !bindingsEqual(b, pending.binding),
      );
      setBinding(other, remaining);
    }
    applyBinding(pending.id, pending.binding);
    setPending(null);
  };

  const toggleAll = () => {
    const next = !allOpen;
    setOpenSurfaces(
      surfaces.reduce(
        (acc, s) => ({ ...acc, [s]: next }),
        {} as Record<Surface, boolean>,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Preset + layering explainer ────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <Eyebrow>Preset</Eyebrow>
        <PresetDropdown value={selectedPreset} onChange={setPreset} />
        <LayeringNote preset={selectedPreset} />
      </section>

      {/* ── Sticky control bar: search (name|key), conflict alert ─────────────
          Deliberately reset-free: destructive actions live with their scope
          (section headers) or in the danger row at the bottom, never beside
          the search field where a stray click can nuke every override. */}
      <div className="sticky top-0 z-10 -mt-2 flex flex-col gap-3 border-b border-white/[0.06] bg-ui-modal py-3">
        <div className="flex items-center gap-1.5 rounded-none bg-white/[0.04] p-1.5 ring-1 ring-white/15">
          <ModeToggle mode={searchMode} onChange={switchMode} />
          {searchMode === "name" ? (
            <NameSearchField value={nameSearch} onChange={setNameSearch} />
          ) : (
            <KeySearchField
              binding={keyQuery}
              listening={listening}
              onArm={() => setListening(true)}
              onClear={clearKeyQuery}
            />
          )}
        </div>

        {pending && (
          <ConflictAlert
            pending={pending}
            onConfirm={confirmRebind}
            onCancel={() => setPending(null)}
          />
        )}
      </div>

      {/* ── Meta row: counts + expand/collapse ─────────────────────────────── */}
      <div className="-my-2 flex items-center justify-between px-1 text-xs tracking-wide text-base-fg/40">
        <span className="tabular-nums">
          {searchActive
            ? `${totalMatches} ${totalMatches === 1 ? "match" : "matches"}`
            : overriddenCount > 0
              ? `${overriddenCount} customized`
              : "Default bindings"}
        </span>
        {!searchActive && (
          <button
            type="button"
            onClick={toggleAll}
            className="font-medium text-base-fg/50 transition-colors hover:text-base-fg/80"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {/* ── Action list, collapsible per surface → grouped ─────────────────── */}
      {searchActive && totalMatches === 0 ? (
        <EmptyState mode={searchMode} query={nameSearch} binding={keyQuery} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(({ surface, groups, count }) => {
            if (searchActive && count === 0) return null;
            const locked = searchActive; // search forces matched surfaces open
            const open = locked ? true : openSurfaces[surface];
            return (
              <CollapsibleSurface
                key={surface}
                title={SURFACE_TITLES[surface]}
                hint={SURFACE_HINTS[surface]}
                count={count}
                overriddenCount={overriddenBySurface[surface] ?? 0}
                open={open}
                locked={locked}
                onToggle={() =>
                  setOpenSurfaces((s) => ({ ...s, [surface]: !s[surface] }))
                }
                onReset={() => resetSurface(surface)}
              >
                {groups.map(({ group, actions }) => (
                  <div key={group}>
                    <GroupLabel>{group}</GroupLabel>
                    {actions.map((action) => (
                      <ActionRow
                        key={action.id}
                        action={action}
                        bindings={forAction(action.id)}
                        defaultBindings={presetDefault(
                          action.id,
                          selectedPreset,
                        )}
                        overridden={!!overrides[action.id]}
                        onCapture={(b) => handleCapture(action.id, b)}
                        onReset={() => resetAction(action.id)}
                      />
                    ))}
                  </div>
                ))}
              </CollapsibleSurface>
            );
          })}
        </div>
      )}

      {/* ── Danger zone: the global reset lives at the very bottom, spatially
          separated from search and the everyday controls, styled destructive,
          and gated behind a two-step confirm. Hidden when there is nothing to
          destroy. ─────────────────────────────────────────────────────────── */}
      {overriddenCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-none bg-red/[0.04] p-4 ring-1 ring-red/20">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-medium text-base-fg/90">
              Reset all customizations
            </span>
            <span className="text-xs leading-relaxed text-base-fg/50">
              Removes {overriddenCount === 1 ? "your 1 custom binding" : `all ${overriddenCount} custom bindings`}{" "}
              on every surface. Your preset stays selected. This can’t be
              undone.
            </span>
          </div>
          <ConfirmResetButton
            idleLabel="Reset all"
            confirmLabel={`Confirm — reset ${overriddenCount}`}
            title={`Reset all ${overriddenCount} customized bindings to the preset defaults`}
            prominent
            confirmDelayMs={2000}
            onConfirm={resetAll}
          />
        </div>
      )}

      {/* ── Video editor lives in its own customizer ───────────────────────── */}
      <div className="flex items-start gap-3 rounded-none bg-white/[0.02] p-4 text-[13px] leading-relaxed text-base-fg/55 ring-1 ring-white/15">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-base-fg/35" />
        <span>
          Video editor shortcuts are managed in the video editor itself
          {onOpenVideoEditorShortcuts ? (
            <>
              {" — "}
              <button
                type="button"
                onClick={onOpenVideoEditorShortcuts}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                open shortcut settings
              </button>
              .
            </>
          ) : (
            " (Video editor → Settings → Shortcuts)."
          )}
        </span>
      </div>
    </div>
  );
}


// ── Bits ──────────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
      {children}
    </span>
  );
}


function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-4 font-mono text-[11px] font-medium uppercase tracking-[0.13em] text-base-fg/45 first:pt-2">
      {children}
    </div>
  );
}


function presetDefault(id: ActionId, preset: PresetId): Binding[] {
  return PRESETS[preset].bindings[id] ?? BASE_BINDINGS[id] ?? [];
}

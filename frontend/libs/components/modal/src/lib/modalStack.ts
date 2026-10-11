// ---------------------------------------------------------------------------
// Modal stack registration and page-wide Escape dispatch
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    __modalEscListenerInstalled?: boolean;
  }
}

// ---------------------------------------------------------------------------
// Modal ESC handling & stack tracking
// If several modals are stacked, Esc will dismiss the one visually on top (highest z-index).
// ---------------------------------------------------------------------------

// Upper bound on the close (leave) spring, after which the panel is gone and no
// legitimate owner should still be holding the body pointer-events lock.
const LEAVE_ANIMATION_SETTLE_MS = 500;

interface ModalRegistryEntry {
  id: number;
  zIndex: number;
  onClose: () => void;
  closeOnEsc: boolean;
}

const modalRegistry: ModalRegistryEntry[] = [];

// ---------------------------------------------------------------------------
// Stranded body-lock recovery
//
// `Dialog.Overlay`/`Dialog.Content` are `forceMount`ed here so react-spring owns
// the enter/leave animation instead of Radix's `Presence`. The side effect is
// that `Dialog.Root`'s `open` flips to false the instant a modal closes, while
// the layer stays mounted for the leave spring. Radix derives
// `disableOutsidePointerEvents` from that same `open` flag, so its
// DismissableLayer tears down through the "was never disabled" branch and never
// restores the `pointer-events: none` it put on <body> when the modal opened.
//
// Closing slowly hides this (a later render clears it), but opening and
// dismissing fast interrupts the leave spring mid-flight and the lock is left
// behind — an invisible, page-wide click blocker.
//
// Radix reference-counts its own layers correctly, so we only step in once no
// registered modal is left to legitimately own a lock.
let strandedLockCheck: number | undefined;

const releaseStrandedBodyLock = () => {
  if (typeof document === "undefined") return;

  // The check has to outlive the current commit: Radix's own layer cleanup and
  // the leave spring's final renders both run after this, and either can set the
  // lock again. Re-checking on a later frame means we only ever clear a lock
  // that nothing came back to claim.
  if (strandedLockCheck !== undefined) {
    window.clearTimeout(strandedLockCheck);
  }
  strandedLockCheck = window.setTimeout(() => {
    strandedLockCheck = undefined;
    if (modalRegistry.length > 0) return;
    // Another Radix dialog (one not built on this Modal) may legitimately hold
    // the lock; it tags its overlay/content data-state="open" while it does.
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, LEAVE_ANIMATION_SETTLE_MS);
};

export const registerModal = (entry: ModalRegistryEntry) => {
  modalRegistry.push(entry);
};

export const unregisterModal = (id: number) => {
  const idx = modalRegistry.findIndex((m) => m.id === id);
  if (idx !== -1) modalRegistry.splice(idx, 1);
  releaseStrandedBodyLock();
};

export const updateModal = (
  id: number,
  data: Partial<{ zIndex: number; onClose: () => void; closeOnEsc: boolean }>,
) => {
  const entry = modalRegistry.find((m) => m.id === id);
  if (entry) Object.assign(entry, data);
};

const getTopEscapableModal = (): ModalRegistryEntry | undefined => {
  return modalRegistry
    .filter((m) => m.closeOnEsc)
    .sort((a, b) => b.zIndex - a.zIndex)[0];
};

// Install one global ESC listener (once per page load)
if (typeof window !== "undefined" && !window.__modalEscListenerInstalled) {
  window.__modalEscListenerInstalled = true;
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    // An open outside-safe panel (mention autocomplete etc.) claims Escape.
    if (document.querySelector(OUTSIDE_SAFE_SELECTOR)) return;
    const top = getTopEscapableModal();
    if (top) {
      e.preventDefault();
      top.onClose();
    }
  });
}

// Simple global z-index tracker for stacked modals
let modalZCounter = 70;

// Body-portaled companions of modal content (e.g. the prompt box's mention
// autocomplete, which portals to <body> for fixed positioning) mark their
// root with this attribute. Pointer-downs inside them must not count as
// outside clicks, and while one is open it claims Escape before the modal.
export const OUTSIDE_SAFE_SELECTOR = "[data-modal-outside-safe]";

export function allocateModalZIndex(): number {
  return ++modalZCounter;
}

export function raiseModalZIndex(current: number): number {
  return current < modalZCounter ? ++modalZCounter : current;
}

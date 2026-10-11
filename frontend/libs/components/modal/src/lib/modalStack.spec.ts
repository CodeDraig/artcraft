import { vi } from "vitest";
import {
  allocateModalZIndex,
  raiseModalZIndex,
  registerModal,
  unregisterModal,
  updateModal,
} from "./modalStack";

describe("modal stack", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    unregisterModal(1);
    unregisterModal(2);
    vi.runAllTimers();
    document.body.style.pointerEvents = "";
    vi.useRealTimers();
  });

  it("dispatches Escape to the top eligible modal and respects portaled companions", () => {
    const first = vi.fn();
    const second = vi.fn();
    const lower = allocateModalZIndex();
    const upper = allocateModalZIndex();
    registerModal({ id: 1, zIndex: lower, closeOnEsc: true, onClose: first });
    registerModal({ id: 2, zIndex: upper, closeOnEsc: true, onClose: second });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(second).toHaveBeenCalledTimes(1);
    const raised = raiseModalZIndex(lower);
    expect(raised).toBeGreaterThan(upper);
    expect(raiseModalZIndex(raised)).toBe(raised);
    updateModal(1, { zIndex: raised });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(first).toHaveBeenCalledTimes(1);
    const companion = document.createElement("div");
    companion.setAttribute("data-modal-outside-safe", "");
    document.body.append(companion);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(first).toHaveBeenCalledTimes(1);
    companion.remove();
  });

  it("releases a stranded lock after the leave animation only when no dialog owns it", () => {
    document.body.style.pointerEvents = "none";
    registerModal({
      id: 1,
      zIndex: allocateModalZIndex(),
      closeOnEsc: true,
      onClose: vi.fn(),
    });
    registerModal({
      id: 2,
      zIndex: allocateModalZIndex(),
      closeOnEsc: true,
      onClose: vi.fn(),
    });
    unregisterModal(2);
    vi.advanceTimersByTime(500);
    expect(document.body.style.pointerEvents).toBe("none");
    unregisterModal(1);
    vi.advanceTimersByTime(499);
    expect(document.body.style.pointerEvents).toBe("none");
    vi.advanceTimersByTime(1);
    expect(document.body.style.pointerEvents).toBe("");

    const externalDialog = document.createElement("div");
    externalDialog.setAttribute("role", "dialog");
    externalDialog.setAttribute("data-state", "open");
    document.body.append(externalDialog);
    document.body.style.pointerEvents = "none";
    unregisterModal(1);
    vi.advanceTimersByTime(500);
    expect(document.body.style.pointerEvents).toBe("none");
    externalDialog.remove();
  });
});

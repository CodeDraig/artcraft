import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfoHint } from "./InfoHint";
import { PortalTooltip } from "./PortalTooltip";
import { SubmenuFlyout } from "./SubmenuFlyout";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("popover portal lifecycles", () => {
  it("opens a tooltip after its delay, dismisses on Escape, and clears timers", () => {
    const { unmount } = render(
      <PortalTooltip content="Details" delay={300}>
        <button>Model</button>
      </PortalTooltip>,
    );
    fireEvent.mouseEnter(screen.getByText("Model"));
    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByText("Details")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByText("Details").closest("[data-modal-outside-safe]"),
    ).not.toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Details")).toBeNull();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a clicked info hint pinned across mouse leave without selecting its row", () => {
    const select = vi.fn();
    render(
      <div onClick={select}>
        <InfoHint content="Model info" />
      </div>,
    );
    const button = screen.getByRole("button", { name: "More info" });
    fireEvent.click(button);
    fireEvent.mouseLeave(button);
    expect(screen.getByText("Model info")).toBeTruthy();
    expect(select).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Model info")).toBeNull();
  });

  it("keeps a submenu open while a child tooltip receives a provider choice", () => {
    const selected = vi.fn();
    const close = vi.fn();
    const chooseProvider = vi.fn();
    const child = {
      label: "Version",
      selected: true,
      hoverTooltip: (closePopover: () => void) => (
        <button
          onClick={() => {
            chooseProvider();
            closePopover();
          }}
        >
          Provider
        </button>
      ),
    };
    render(
      <SubmenuFlyout
        item={{ label: "Family", selected: true, subItems: [child] }}
        onSelectChild={selected}
        popoverClose={close}
      >
        <button>Open family</button>
      </SubmenuFlyout>,
    );
    fireEvent.click(screen.getByText("Open family"));
    fireEvent.mouseEnter(screen.getByText("Version"));
    act(() => vi.advanceTimersByTime(300));
    const provider = screen.getByText("Provider");
    fireEvent.mouseDown(provider);
    fireEvent.click(provider);
    expect(chooseProvider).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(selected).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Version")).toBeNull();
  });
});

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { vi } from "vitest";
import { ConfirmResetButton } from "./ConfirmResetButton";

describe("reset confirmation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const mount = (onConfirm = vi.fn()) => {
    const view = render(
      <ConfirmResetButton
        idleLabel="Reset"
        confirmLabel="Confirm"
        title="Reset shortcuts"
        confirmDelayMs={500}
        onConfirm={onConfirm}
      />,
    );
    return { ...view, button: screen.getByRole("button"), onConfirm };
  };

  it("swallows double clicks during lockout and confirms only once after it", () => {
    const { button, onConfirm } = mount();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe("Reset");
  });

  it("disarms on Escape, blur and expiry, and clears timers on unmount", () => {
    const { button, unmount, onConfirm } = mount();
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.textContent).toBe("Reset");
    fireEvent.click(button);
    fireEvent.blur(button);
    expect(button.textContent).toBe("Reset");
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(5500));
    expect(button.textContent).toBe("Reset");
    fireEvent.click(button);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

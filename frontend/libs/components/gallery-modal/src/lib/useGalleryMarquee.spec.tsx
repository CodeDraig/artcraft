import { useRef, useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGalleryMarquee } from "./useGalleryMarquee";
import { galleryModalLightboxVisible } from "./galleryModalSignals";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  galleryModalLightboxVisible.value = false;
});

afterEach(() => {
  fireEvent(window, new MouseEvent("pointerup"));
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("gallery marquee", () => {
  it("adds intersecting tiles and releases the gesture resources", () => {
    render(<Selection />);
    const scroller = screen.getByTestId("scroller");
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue(
      rect(0, 0, 400, 400),
    );
    vi.spyOn(
      screen.getByTestId("tile"),
      "getBoundingClientRect",
    ).mockReturnValue(rect(120, 120, 30, 30));

    pointerDown(scroller, "mouse");
    fireEvent(
      window,
      new MouseEvent("pointermove", { clientX: 160, clientY: 160 }),
    );
    act(() => vi.advanceTimersByTime(20));
    expect(screen.getByTestId("selection").textContent).toBe("existing,tile");
    expect(document.body.style.userSelect).toBe("none");

    fireEvent(window, new MouseEvent("pointerup"));
    expect(document.body.style.userSelect).toBe("");
    expect(screen.getByTestId("marquee").style.display).toBe("none");
    fireEvent(
      window,
      new MouseEvent("pointermove", { clientX: 300, clientY: 300 }),
    );
    act(() => vi.advanceTimersByTime(20));
    expect(screen.getByTestId("selection").textContent).toBe("existing,tile");
  });

  it("ignores controls and a visible lightbox; a blank touch tap clears selection", () => {
    render(<Selection />);
    pointerDown(screen.getByRole("button"), "mouse");
    fireEvent(window, new MouseEvent("pointerup"));
    expect(screen.getByTestId("selection").textContent).toBe("existing");

    galleryModalLightboxVisible.value = true;
    pointerDown(screen.getByTestId("scroller"), "mouse");
    fireEvent(window, new MouseEvent("pointerup"));
    expect(screen.getByTestId("selection").textContent).toBe("existing");

    galleryModalLightboxVisible.value = false;
    pointerDown(screen.getByTestId("scroller"), "touch");
    fireEvent(window, new MouseEvent("pointerup"));
    expect(screen.getByTestId("selection").textContent).toBe("");
  });
});

function Selection() {
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(new Set(["existing"]));
  const { marqueeRef, handleMarqueePointerDown } = useGalleryMarquee(
    scroller,
    selected,
    setSelected,
  );
  return (
    <>
      <div
        ref={scroller}
        data-testid="scroller"
        onPointerDown={handleMarqueePointerDown}
      >
        <button>Control</button>
        <div data-testid="tile" data-media-id="tile" />
      </div>
      <div ref={marqueeRef} data-testid="marquee" />
      <output data-testid="selection">{[...selected].join(",")}</output>
    </>
  );
}

function pointerDown(target: HTMLElement, pointerType: string) {
  const event = new MouseEvent("pointerdown", {
    bubbles: true,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(target, event);
}

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  };
}

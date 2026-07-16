import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Stroke } from "../../types/project";
import { SketchOverlay } from "./SketchOverlay";

// jsdom does not implement the Pointer Events capture API; SketchOverlay relies on
// it while drawing, so polyfill a no-op version for these tests.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

const mockOverlayBounds = (element: Element) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 200,
    bottom: 100,
    width: 200,
    height: 100,
    toJSON: () => {},
  } as DOMRect);
};

describe("SketchOverlay", () => {
  it("captures a freehand stroke as normalized points and commits it on pointer up", () => {
    const onStrokeComplete = vi.fn();
    render(<SketchOverlay sketchMode strokes={[]} onStrokeComplete={onStrokeComplete} />);

    const overlay = screen.getByRole("presentation");
    mockOverlayBounds(overlay);

    fireEvent.pointerDown(overlay, { clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(overlay, { clientX: 100, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(overlay, { clientX: 100, clientY: 60, pointerId: 1 });

    expect(onStrokeComplete).toHaveBeenCalledTimes(1);
    const stroke = onStrokeComplete.mock.calls[0][0] as Stroke;
    expect(stroke[0]).toEqual({ x: 0.1, y: 0.2 });
    expect(stroke[stroke.length - 1]).toEqual({ x: 0.5, y: 0.6 });
  });

  it("renders each stored stroke as a polyline", () => {
    const strokes: Stroke[] = [
      [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
      [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.4 }],
    ];
    render(<SketchOverlay sketchMode={false} strokes={strokes} onStrokeComplete={vi.fn()} />);

    expect(document.querySelectorAll("polyline")).toHaveLength(2);
  });

  it("does not capture pointer events (and lets them pass through) when sketch mode is off", () => {
    const onStrokeComplete = vi.fn();
    render(<SketchOverlay sketchMode={false} strokes={[]} onStrokeComplete={onStrokeComplete} />);

    const overlay = screen.getByRole("presentation");
    mockOverlayBounds(overlay);

    fireEvent.pointerDown(overlay, { clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(overlay, { clientX: 100, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(overlay, { clientX: 100, clientY: 60, pointerId: 1 });

    expect(onStrokeComplete).not.toHaveBeenCalled();
    expect(overlay.className).not.toContain("sketch-mode");
  });
});

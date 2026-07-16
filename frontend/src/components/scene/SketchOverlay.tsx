import { useRef, useState, type PointerEvent } from "react";

import type { Point, Stroke } from "../../types/project";

type SketchOverlayProps = {
  sketchMode: boolean;
  strokes: Stroke[];
  onStrokeComplete: (stroke: Stroke) => void;
};

const pointFromEvent = (event: PointerEvent<HTMLDivElement>): Point => {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
  };
};

const toPolylinePoints = (stroke: Stroke): string => stroke.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");

export function SketchOverlay({ sketchMode, strokes, onStrokeComplete }: SketchOverlayProps) {
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const drawing = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!sketchMode) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drawing.current = true;
    setActiveStroke([pointFromEvent(event)]);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!sketchMode || !drawing.current) return;
    // Read the point synchronously - `event.currentTarget` is nulled out once
    // the handler returns, so it must not be touched inside the setState
    // updater callback below (which React can invoke later).
    const point = pointFromEvent(event);
    setActiveStroke((current) => (current ? [...current, point] : current));
  };

  const commitActiveStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setActiveStroke((current) => {
      if (current && current.length) onStrokeComplete(current);
      return null;
    });
  };

  const handlePointerUp = () => {
    commitActiveStroke();
  };

  return (
    <div
      className={`sketch-overlay ${sketchMode ? "sketch-mode" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="presentation"
      aria-label="Sketch layer"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {strokes.map((stroke, index) => (
          <polyline key={index} points={toPolylinePoints(stroke)} />
        ))}
        {activeStroke && activeStroke.length > 1 && <polyline points={toPolylinePoints(activeStroke)} />}
      </svg>
    </div>
  );
}

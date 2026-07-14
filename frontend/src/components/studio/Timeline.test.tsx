import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Keyframe } from "../../types/project";
import { Timeline } from "./Timeline";

const mockRulerBounds = (element: Element) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 240,
    bottom: 40,
    width: 240,
    height: 40,
    toJSON: () => {},
  } as DOMRect);
};

const keyframes: Keyframe[] = [
  { frame: 0, pose: {} },
  { frame: 24, pose: {} },
];

describe("Timeline", () => {
  it("renders a 0-24 ruler with tick marks every 2 frames", () => {
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={vi.fn()} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    [0, 2, 12, 24].forEach((tick) => {
      expect(screen.getByText(String(tick))).toBeInTheDocument();
    });
  });

  it("renders a keyframe diamond for every keyframe", () => {
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={vi.fn()} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Go to keyframe 0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to keyframe 24" })).toBeInTheDocument();
  });

  it("shows the current frame out of 24 in the transport readout", () => {
    render(
      <Timeline frame={12} keyframes={keyframes} playing={false} onFrameChange={vi.fn()} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    const transport = document.querySelector(".transport") as HTMLDivElement;
    expect(transport).toHaveTextContent("12");
    expect(transport).toHaveTextContent("/ 24");
  });

  it("clicking Play calls onPlayToggle so playback can advance the playhead from 0", () => {
    const onPlayToggle = vi.fn();
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={vi.fn()} onPlayToggle={onPlayToggle} onSaveKeyframe={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Play animation" }));

    expect(onPlayToggle).toHaveBeenCalledTimes(1);
  });

  it("shows a Pause label and keeps calling onPlayToggle once playback is running", () => {
    const onPlayToggle = vi.fn();
    render(
      <Timeline frame={4} keyframes={keyframes} playing={true} onFrameChange={vi.fn()} onPlayToggle={onPlayToggle} onSaveKeyframe={vi.fn()} />,
    );

    const pauseButton = screen.getByRole("button", { name: "Pause playback" });
    fireEvent.click(pauseButton);

    expect(onPlayToggle).toHaveBeenCalledTimes(1);
  });

  it("jumps to frame 0 when the first-frame transport button is clicked", () => {
    const onFrameChange = vi.fn();
    render(
      <Timeline frame={18} keyframes={keyframes} playing={false} onFrameChange={onFrameChange} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to first frame" }));

    expect(onFrameChange).toHaveBeenCalledWith(0);
  });

  it("jumps to a keyframe's frame when its diamond is clicked", () => {
    const onFrameChange = vi.fn();
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={onFrameChange} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to keyframe 24" }));

    expect(onFrameChange).toHaveBeenCalledWith(24);
  });

  it("calls onSaveKeyframe when the save keyframe button is clicked", () => {
    const onSaveKeyframe = vi.fn();
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={vi.fn()} onPlayToggle={vi.fn()} onSaveKeyframe={onSaveKeyframe} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save keyframe" }));

    expect(onSaveKeyframe).toHaveBeenCalledTimes(1);
  });

  it("scrubs the ruler to the nearest frame when the pointer goes down", () => {
    const onFrameChange = vi.fn();
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={onFrameChange} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    const ruler = document.querySelector(".ruler") as HTMLDivElement;
    mockRulerBounds(ruler);

    fireEvent.pointerDown(ruler, { clientX: 120 });

    expect(onFrameChange).toHaveBeenCalledWith(12);
  });

  it("clamps ruler scrubbing to the 0-24 frame range", () => {
    const onFrameChange = vi.fn();
    render(
      <Timeline frame={0} keyframes={keyframes} playing={false} onFrameChange={onFrameChange} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    const ruler = document.querySelector(".ruler") as HTMLDivElement;
    mockRulerBounds(ruler);

    fireEvent.pointerDown(ruler, { clientX: -50 });
    expect(onFrameChange).toHaveBeenCalledWith(0);

    fireEvent.pointerDown(ruler, { clientX: 1000 });
    expect(onFrameChange).toHaveBeenCalledWith(24);
  });

  it("renders the playhead positioned proportionally to the current frame", () => {
    render(
      <Timeline frame={12} keyframes={keyframes} playing={false} onFrameChange={vi.fn()} onPlayToggle={vi.fn()} onSaveKeyframe={vi.fn()} />,
    );

    const playhead = document.querySelector(".playhead") as HTMLDivElement;
    expect(playhead.style.getPropertyValue("--frame-position")).toBe("50%");
  });
});

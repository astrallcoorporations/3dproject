import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Keyframe } from "../../types/project";
import { PoseLibrary } from "./PoseLibrary";

const keyframes: Keyframe[] = [
  { frame: 24, pose: {} },
  { frame: 0, pose: {} },
  { frame: 12, pose: {} },
];

describe("PoseLibrary", () => {
  it("renders one card per keyframe, sorted by frame regardless of input order", () => {
    render(
      <PoseLibrary keyframes={keyframes} playhead={0} onEdit={vi.fn()} onDelete={vi.fn()} onReturnToRig={vi.fn()} />,
    );

    const frames = screen.getAllByText(/Frame \d\d/).map((node) => node.textContent);
    expect(frames).toEqual(["Frame 00", "Frame 12", "Frame 24"]);
  });

  it("marks the card matching the current playhead frame", () => {
    render(
      <PoseLibrary keyframes={keyframes} playhead={12} onEdit={vi.fn()} onDelete={vi.fn()} onReturnToRig={vi.fn()} />,
    );

    const current = document.querySelector(".pose-card.current");
    expect(current).toHaveTextContent("Frame 12");
  });

  it("calls onEdit with the keyframe's frame when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(
      <PoseLibrary keyframes={keyframes} playhead={0} onEdit={onEdit} onDelete={vi.fn()} onReturnToRig={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit keyframe 12" }));

    expect(onEdit).toHaveBeenCalledWith(12);
  });

  it("calls onDelete with the keyframe's frame when Delete is clicked", () => {
    const onDelete = vi.fn();
    render(
      <PoseLibrary keyframes={keyframes} playhead={0} onEdit={vi.fn()} onDelete={onDelete} onReturnToRig={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete keyframe 24" }));

    expect(onDelete).toHaveBeenCalledWith(24);
  });

  it("shows an empty-state message when there are no keyframes", () => {
    render(<PoseLibrary keyframes={[]} playhead={0} onEdit={vi.fn()} onDelete={vi.fn()} onReturnToRig={vi.fn()} />);

    expect(screen.getByText(/No poses saved yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit keyframe/ })).not.toBeInTheDocument();
  });

  it("calls onReturnToRig when the return link is clicked", () => {
    const onReturnToRig = vi.fn();
    render(
      <PoseLibrary keyframes={keyframes} playhead={0} onEdit={vi.fn()} onDelete={vi.fn()} onReturnToRig={onReturnToRig} />,
    );

    fireEvent.click(screen.getByText("← Return to rigging"));

    expect(onReturnToRig).toHaveBeenCalledTimes(1);
  });
});

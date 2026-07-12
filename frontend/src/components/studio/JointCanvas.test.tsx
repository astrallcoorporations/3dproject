import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Rig } from "../../types/project";
import { JointCanvas } from "./JointCanvas";

// jsdom does not implement the Pointer Events capture API; JointCanvas relies on it
// for crop-mode dragging, so polyfill a no-op version for these tests.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

const blankRig: Rig = { joints: {}, bones: [] };

const mockStageBounds = (element: Element) => {
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

describe("JointCanvas", () => {
  it("places the selected joint at the clicked image-relative position", () => {
    const onJointPlace = vi.fn();
    render(
      <JointCanvas
        imageUrl="http://localhost:5000/uploads/art.png"
        rig={blankRig}
        activeJoint="leftElbow"
        selectedBoneId={null}
        cropMode={false}
        onJointPlace={onJointPlace}
        onSelectionChange={vi.fn()}
      />,
    );

    const stage = screen.getByRole("application");
    mockStageBounds(stage);

    fireEvent.pointerDown(stage, { clientX: 50, clientY: 50 });

    expect(onJointPlace).toHaveBeenCalledWith("leftElbow", { x: 0.25, y: 0.5 });
  });

  it("renders a marker for every placed joint at its normalized position", () => {
    const rig: Rig = { joints: { leftElbow: { x: 0.25, y: 0.5 } }, bones: [] };
    render(
      <JointCanvas
        imageUrl="http://localhost:5000/uploads/art.png"
        rig={rig}
        activeJoint="leftElbow"
        selectedBoneId={null}
        cropMode={false}
        onJointPlace={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    const marker = document.querySelector(".joint-dot");
    expect(marker).toHaveStyle({ left: "25%", top: "50%" });
  });

  it("replaces an existing joint marker when the same joint is placed again", () => {
    const onJointPlace = vi.fn();
    const rig: Rig = { joints: { leftElbow: { x: 0.1, y: 0.1 } }, bones: [] };
    render(
      <JointCanvas
        imageUrl="http://localhost:5000/uploads/art.png"
        rig={rig}
        activeJoint="leftElbow"
        selectedBoneId={null}
        cropMode={false}
        onJointPlace={onJointPlace}
        onSelectionChange={vi.fn()}
      />,
    );

    const stage = screen.getByRole("application");
    mockStageBounds(stage);

    fireEvent.pointerDown(stage, { clientX: 150, clientY: 80 });

    expect(onJointPlace).toHaveBeenCalledWith("leftElbow", { x: 0.75, y: 0.8 });
  });

  it("drags a selection rectangle for the selected bone in crop mode", () => {
    const onSelectionChange = vi.fn();
    const rig: Rig = {
      joints: { leftShoulder: { x: 0.2, y: 0.3 }, leftElbow: { x: 0.3, y: 0.5 } },
      bones: [
        {
          id: "leftUpperArm",
          label: "L. upper arm",
          start: "leftShoulder",
          end: "leftElbow",
          parentId: null,
          proxyWidth: 16,
          selection: { x: 0, y: 0, width: 0, height: 0 },
        },
      ],
    };
    render(
      <JointCanvas
        imageUrl="http://localhost:5000/uploads/art.png"
        rig={rig}
        activeJoint="leftElbow"
        selectedBoneId="leftUpperArm"
        cropMode
        onJointPlace={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

    const stage = screen.getByRole("application");
    mockStageBounds(stage);

    fireEvent.pointerDown(stage, { clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(stage, { clientX: 100, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(stage, { clientX: 100, clientY: 60, pointerId: 1 });

    expect(onSelectionChange).toHaveBeenCalledWith("leftUpperArm", {
      x: 0.1,
      y: 0.2,
      width: expect.closeTo(0.4, 10),
      height: expect.closeTo(0.4, 10),
    });
  });
});

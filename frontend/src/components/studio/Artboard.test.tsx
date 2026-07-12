import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Rig } from "../../types/project";
import { Artboard } from "./Artboard";

const blankRig: Rig = { joints: {}, bones: [] };

describe("Artboard", () => {
  it("shows an imported image with an accessible alt label in refine mode", () => {
    render(
      <Artboard
        assetUrl="http://localhost:5000/uploads/art.png"
        mode="refine"
        rig={blankRig}
        activeJoint="neck"
        selectedBoneId={null}
        cropMode={false}
        onPlaceJoint={vi.fn()}
        onSelectionChange={vi.fn()}
        perspectiveGrid={false}
      />,
    );

    const image = screen.getByRole("img", { name: /artwork prepared for refinement/i });
    expect(image).toHaveAttribute("src", "http://localhost:5000/uploads/art.png");
  });

  it("shows the empty state when there is no asset yet", () => {
    render(
      <Artboard
        assetUrl=""
        mode="refine"
        rig={blankRig}
        activeJoint="neck"
        selectedBoneId={null}
        cropMode={false}
        onPlaceJoint={vi.fn()}
        onSelectionChange={vi.fn()}
        perspectiveGrid={false}
      />,
    );

    expect(screen.getByText(/give your character a body/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the joint canvas in rig mode", () => {
    render(
      <Artboard
        assetUrl="http://localhost:5000/uploads/art.png"
        mode="rig"
        rig={blankRig}
        activeJoint="neck"
        selectedBoneId={null}
        cropMode={false}
        onPlaceJoint={vi.fn()}
        onSelectionChange={vi.fn()}
        perspectiveGrid={false}
      />,
    );

    expect(screen.getByRole("application", { name: /place neck joint/i })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Artboard } from "./Artboard";

describe("Artboard", () => {
  it("shows an imported image with an accessible alt label", () => {
    render(
      <Artboard assetUrl="http://localhost:5000/uploads/art.png" joints={{}} onPlaceJoint={vi.fn()} perspectiveGrid={false} />,
    );

    const image = screen.getByRole("img", { name: /artwork prepared for refinement/i });
    expect(image).toHaveAttribute("src", "http://localhost:5000/uploads/art.png");
  });

  it("shows the empty state when there is no asset yet", () => {
    render(<Artboard assetUrl="" joints={{}} onPlaceJoint={vi.fn()} perspectiveGrid={false} />);

    expect(screen.getByText(/give your character a body/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

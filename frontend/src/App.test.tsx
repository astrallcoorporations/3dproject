import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { useProjectStore } from "./store/project-store";
import type { ProjectRecord } from "./types/project";

vi.mock("./lib/api", () => ({
  api: {
    createProject: vi.fn(),
    updateProject: vi.fn(),
    uploadAsset: vi.fn(),
    refineAsset: vi.fn(),
    assetUrl: vi.fn(() => ""),
  },
}));

const makeProject = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: 1,
  ownerId: "studio-local",
  name: "Untitled puppet",
  rig: { joints: {}, bones: [] },
  timeline: { fps: 24, keyframes: [] },
  activeAssetId: null,
  assets: [],
  ...overrides,
});

describe("Studio workbench layout", () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      mode: "refine",
      contrast: 1.18,
      cleanup: true,
      paletteSize: 12,
      busy: false,
      error: null,
      activeJoint: "neck",
      selectedBoneId: null,
      cropMode: false,
      playhead: 0,
      playing: false,
      draftPose: {},
    });
  });

  it("renders the live timeline transport only after the rig gains its first bone", async () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: "Play animation" })).not.toBeInTheDocument();

    act(() => {
      useProjectStore.setState({ project: makeProject() });
    });
    act(() => {
      useProjectStore.getState().placeJoint("leftShoulder", { x: 0.3, y: 0.3 });
    });
    act(() => {
      useProjectStore.getState().placeJoint("leftElbow", { x: 0.4, y: 0.5 });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
    });
  });

  it("toggles aria-expanded on the inspector collapse control when it is collapsed", () => {
    render(<App />);

    const collapseButton = screen.getByRole("button", { name: "Collapse inspector" });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
  });
});

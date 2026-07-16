import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { useProjectStore } from "./store/project-store";
import type { ProjectRecord } from "./types/project";

vi.mock("./lib/api", () => ({
  api: {
    createProject: vi.fn(),
    getProject: vi.fn(),
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

  it("seeds frame 24 with a non-identity default pose so a fresh rig animates on playback", async () => {
    render(<App />);

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
      const keyframes = useProjectStore.getState().project?.timeline.keyframes ?? [];
      expect(keyframes.find((keyframe) => keyframe.frame === 24)).toBeDefined();
    });

    const keyframes = useProjectStore.getState().project!.timeline.keyframes;
    const frame0 = keyframes.find((keyframe) => keyframe.frame === 0)!;
    const frame24 = keyframes.find((keyframe) => keyframe.frame === 24)!;

    // Frame 0 stays the empty "before" pose - the user poses it by hand.
    expect(frame0.pose).toEqual({});

    // Frame 24 must give at least one bone a non-identity transform, otherwise
    // interpolatePose falls back to each bone's rest transform and playback
    // shows zero motion.
    const bonePoses = Object.values(frame24.pose);
    expect(bonePoses.length).toBeGreaterThan(0);
    expect(
      bonePoses.some((pose) => pose.rotation.some((value) => value !== 0) || pose.position.some((value) => value !== 0)),
    ).toBe(true);
  });

  it("toggles aria-expanded on the inspector collapse control when it is collapsed", () => {
    render(<App />);

    const collapseButton = screen.getByRole("button", { name: "Collapse inspector" });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapseButton);

    expect(collapseButton).toHaveAttribute("aria-expanded", "false");
  });
});

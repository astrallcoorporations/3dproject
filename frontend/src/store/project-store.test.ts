import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../lib/api";
import { ACTIVE_PROJECT_STORAGE_KEY, safeStorage } from "../lib/local-storage";
import type { ProjectRecord } from "../types/project";
import { useProjectStore } from "./project-store";

vi.mock("../lib/api", () => ({
  api: {
    createProject: vi.fn(),
    getProject: vi.fn(),
    updateProject: vi.fn(),
    uploadAsset: vi.fn(),
    refineAsset: vi.fn(),
    assetUrl: vi.fn(),
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

describe("useProjectStore", () => {
  beforeEach(() => {
    vi.mocked(api.createProject).mockReset();
    vi.mocked(api.getProject).mockReset();
    vi.mocked(api.uploadAsset).mockReset();
    vi.mocked(api.refineAsset).mockReset();
    safeStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
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

  it("createProject makes the created record the active project", async () => {
    const created = makeProject({ id: 42, name: "New puppet" });
    vi.mocked(api.createProject).mockResolvedValue(created);

    const result = await useProjectStore.getState().createProject("New puppet");

    expect(api.createProject).toHaveBeenCalledWith("New puppet");
    expect(result).toEqual(created);
    expect(useProjectStore.getState().project).toEqual(created);
  });

  it("uploadAsset creates a project first when none is active, then attaches the asset", async () => {
    const created = makeProject({ id: 7 });
    const asset = { id: 100, projectId: 7, kind: "original" as const, url: "/uploads/a.png", width: 10, height: 10 };
    vi.mocked(api.createProject).mockResolvedValue(created);
    vi.mocked(api.uploadAsset).mockResolvedValue(asset);

    const file = new File(["data"], "art.png", { type: "image/png" });
    const result = await useProjectStore.getState().uploadAsset(file);

    expect(api.createProject).toHaveBeenCalledWith("Untitled puppet");
    expect(api.uploadAsset).toHaveBeenCalledWith(7, file);
    expect(result).toEqual(asset);
    expect(useProjectStore.getState().project?.assets).toEqual([asset]);
    expect(useProjectStore.getState().project?.activeAssetId).toBe(100);
    expect(useProjectStore.getState().busy).toBe(false);
  });

  it("uploadAsset surfaces an API error and resets busy", async () => {
    useProjectStore.setState({ project: makeProject({ id: 3 }) });
    vi.mocked(api.uploadAsset).mockRejectedValue(new Error("Puppet could not import that image."));

    const file = new File(["data"], "art.png", { type: "image/png" });
    await expect(useProjectStore.getState().uploadAsset(file)).rejects.toThrow();

    expect(useProjectStore.getState().error).toBe("Puppet could not import that image.");
    expect(useProjectStore.getState().busy).toBe(false);
  });

  it("refineActiveAsset replaces the active asset and switches to rig mode", async () => {
    const original = { id: 1, projectId: 5, kind: "original" as const, url: "/uploads/a.png", width: 10, height: 10 };
    const refined = { id: 2, projectId: 5, kind: "refined" as const, url: "/uploads/b.png", width: 10, height: 10 };
    useProjectStore.setState({ project: makeProject({ id: 5, assets: [original], activeAssetId: 1 }) });
    vi.mocked(api.refineAsset).mockResolvedValue(refined);

    const settings = { contrast: 1.2, cleanup: true, paletteSize: 12 };
    const result = await useProjectStore.getState().refineActiveAsset(settings);

    expect(api.refineAsset).toHaveBeenCalledWith(1, settings);
    expect(result).toEqual(refined);
    expect(useProjectStore.getState().project?.activeAssetId).toBe(2);
    expect(useProjectStore.getState().project?.assets).toEqual([original, refined]);
    expect(useProjectStore.getState().mode).toBe("rig");
  });

  it("createProject remembers the active project id in storage", async () => {
    const created = makeProject({ id: 42, name: "New puppet" });
    vi.mocked(api.createProject).mockResolvedValue(created);

    await useProjectStore.getState().createProject("New puppet");

    expect(safeStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)).toBe("42");
  });

  it("restoreProject does nothing when no project id was ever saved", async () => {
    const result = await useProjectStore.getState().restoreProject();

    expect(result).toBeNull();
    expect(api.getProject).not.toHaveBeenCalled();
    expect(useProjectStore.getState().project).toBeNull();
  });

  it("restoreProject fetches and hydrates the project remembered in storage", async () => {
    const restored = makeProject({ id: 42, name: "Remembered puppet" });
    safeStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, "42");
    vi.mocked(api.getProject).mockResolvedValue(restored);

    const result = await useProjectStore.getState().restoreProject();

    expect(api.getProject).toHaveBeenCalledWith(42);
    expect(result).toEqual(restored);
    expect(useProjectStore.getState().project).toEqual(restored);
  });

  it("restoreProject clears the stale id and leaves the studio blank when the fetch fails", async () => {
    safeStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, "999");
    vi.mocked(api.getProject).mockRejectedValue(new Error("Project not found."));

    const result = await useProjectStore.getState().restoreProject();

    expect(result).toBeNull();
    expect(useProjectStore.getState().project).toBeNull();
    expect(safeStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)).toBeNull();
  });

  it("restoreProject is a no-op when a project is already active", async () => {
    const active = makeProject({ id: 5 });
    useProjectStore.setState({ project: active });

    const result = await useProjectStore.getState().restoreProject();

    expect(result).toEqual(active);
    expect(api.getProject).not.toHaveBeenCalled();
  });

  it("placeJoint records a joint's position and derives bones from the joint map", () => {
    useProjectStore.setState({ project: makeProject({ id: 9 }) });

    useProjectStore.getState().placeJoint("leftShoulder", { x: 0.2, y: 0.3 });
    useProjectStore.getState().placeJoint("leftElbow", { x: 0.25, y: 0.5 });

    const { rig } = useProjectStore.getState().project!;
    expect(rig.joints.leftShoulder).toEqual({ x: 0.2, y: 0.3 });
    expect(rig.joints.leftElbow).toEqual({ x: 0.25, y: 0.5 });
    expect(rig.bones.map((bone) => bone.id)).toContain("leftUpperArm");
  });

  it("placeJoint overwrites a previously placed joint of the same name", () => {
    useProjectStore.setState({ project: makeProject({ id: 9 }) });

    useProjectStore.getState().placeJoint("neck", { x: 0.1, y: 0.1 });
    useProjectStore.getState().placeJoint("neck", { x: 0.4, y: 0.6 });

    expect(useProjectStore.getState().project!.rig.joints.neck).toEqual({ x: 0.4, y: 0.6 });
  });

  it("placeJoint does nothing when there is no active project", () => {
    useProjectStore.getState().placeJoint("neck", { x: 0.1, y: 0.1 });

    expect(useProjectStore.getState().project).toBeNull();
  });

  it("updateSelection updates the matching bone's selection rectangle", () => {
    const bone = {
      id: "leftUpperArm",
      label: "L. upper arm",
      start: "leftShoulder" as const,
      end: "leftElbow" as const,
      parentId: null,
      proxyWidth: 16,
      selection: { x: 0, y: 0, width: 0, height: 0 },
    };
    useProjectStore.setState({
      project: makeProject({ id: 9, rig: { joints: {}, bones: [bone] } }),
    });

    useProjectStore.getState().updateSelection("leftUpperArm", { x: 0.1, y: 0.2, width: 0.3, height: 0.4 });

    const updated = useProjectStore.getState().project!.rig.bones[0];
    expect(updated.selection).toEqual({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
  });

  it("updateSelection ignores selections smaller than the minimum size", () => {
    const bone = {
      id: "leftUpperArm",
      label: "L. upper arm",
      start: "leftShoulder" as const,
      end: "leftElbow" as const,
      parentId: null,
      proxyWidth: 16,
      selection: { x: 0, y: 0, width: 0.5, height: 0.5 },
    };
    useProjectStore.setState({
      project: makeProject({ id: 9, rig: { joints: {}, bones: [bone] } }),
    });

    useProjectStore.getState().updateSelection("leftUpperArm", { x: 0.1, y: 0.2, width: 0.001, height: 0.001 });

    const updated = useProjectStore.getState().project!.rig.bones[0];
    expect(updated.selection).toEqual({ x: 0, y: 0, width: 0.5, height: 0.5 });
  });

  it("setActiveJoint, setSelectedBoneId, and setCropMode update rig-mode selection state", () => {
    useProjectStore.getState().setActiveJoint("leftElbow");
    useProjectStore.getState().setSelectedBoneId("leftUpperArm");
    useProjectStore.getState().setCropMode(true);

    expect(useProjectStore.getState().activeJoint).toBe("leftElbow");
    expect(useProjectStore.getState().selectedBoneId).toBe("leftUpperArm");
    expect(useProjectStore.getState().cropMode).toBe(true);
  });

  describe("timeline state", () => {
    afterEach(() => {
      useProjectStore.getState().setPlaying(false);
      vi.useRealTimers();
    });

    it("setPlayhead updates the current frame", () => {
      useProjectStore.getState().setPlayhead(12);

      expect(useProjectStore.getState().playhead).toBe(12);
    });

    it("setDraftPose replaces the in-progress pose", () => {
      const pose = { arm: { rotation: [0, 1, 0] as [number, number, number], position: [0, 0, 0] as [number, number, number] } };

      useProjectStore.getState().setDraftPose(pose);

      expect(useProjectStore.getState().draftPose).toEqual(pose);
    });

    it("updateDraftPose edits a single axis of a bone's pose, defaulting missing bones to identity", () => {
      useProjectStore.getState().updateDraftPose("arm", "rotation", 1, Math.PI / 2);

      expect(useProjectStore.getState().draftPose.arm).toEqual({
        rotation: [0, Math.PI / 2, 0],
        position: [0, 0, 0],
      });

      useProjectStore.getState().updateDraftPose("arm", "position", 2, 1.5);

      expect(useProjectStore.getState().draftPose.arm).toEqual({
        rotation: [0, Math.PI / 2, 0],
        position: [0, 0, 1.5],
      });
    });

    it("saveKeyframe writes the draft pose into the timeline at the given frame, replacing any existing one", () => {
      const bone = {
        id: "leftUpperArm",
        label: "L. upper arm",
        start: "leftShoulder" as const,
        end: "leftElbow" as const,
        parentId: null,
        proxyWidth: 16,
        selection: { x: 0, y: 0, width: 0.5, height: 0.5 },
      };
      const pose = { leftUpperArm: { rotation: [0, 0, 0] as [number, number, number], position: [0, 0, 0] as [number, number, number] } };
      useProjectStore.setState({
        project: makeProject({
          id: 9,
          rig: { joints: {}, bones: [bone] },
          timeline: { fps: 24, keyframes: [{ frame: 5, pose: {} }] },
        }),
        draftPose: pose,
      });

      useProjectStore.getState().saveKeyframe(5);

      const { keyframes } = useProjectStore.getState().project!.timeline;
      expect(keyframes).toEqual([{ frame: 5, pose }]);
    });

    it("saveKeyframe does nothing without an active project or an empty rig", () => {
      useProjectStore.setState({ project: null });

      useProjectStore.getState().saveKeyframe(0);

      expect(useProjectStore.getState().project).toBeNull();
    });

    it("deleteKeyframe removes the keyframe at the given frame", () => {
      useProjectStore.setState({
        project: makeProject({
          id: 9,
          timeline: {
            fps: 24,
            keyframes: [
              { frame: 0, pose: {} },
              { frame: 12, pose: {} },
              { frame: 24, pose: {} },
            ],
          },
        }),
      });

      useProjectStore.getState().deleteKeyframe(12);

      const { keyframes } = useProjectStore.getState().project!.timeline;
      expect(keyframes).toEqual([
        { frame: 0, pose: {} },
        { frame: 24, pose: {} },
      ]);
    });

    it("deleteKeyframe is a no-op when no keyframe exists at that frame", () => {
      const project = makeProject({
        id: 9,
        timeline: { fps: 24, keyframes: [{ frame: 0, pose: {} }] },
      });
      useProjectStore.setState({ project });

      useProjectStore.getState().deleteKeyframe(12);

      expect(useProjectStore.getState().project!.timeline.keyframes).toEqual([{ frame: 0, pose: {} }]);
    });

    it("deleteKeyframe does nothing without an active project", () => {
      useProjectStore.setState({ project: null });

      useProjectStore.getState().deleteKeyframe(0);

      expect(useProjectStore.getState().project).toBeNull();
    });

    it("deleteKeyframe refuses to remove the last remaining keyframe", () => {
      useProjectStore.setState({
        project: makeProject({
          id: 9,
          timeline: { fps: 24, keyframes: [{ frame: 12, pose: {} }] },
        }),
      });

      useProjectStore.getState().deleteKeyframe(12);

      expect(useProjectStore.getState().project!.timeline.keyframes).toEqual([{ frame: 12, pose: {} }]);
    });

    it("setKeyframeEasing sets the easing field on the keyframe at the given frame", () => {
      useProjectStore.setState({
        project: makeProject({
          id: 9,
          timeline: {
            fps: 24,
            keyframes: [
              { frame: 0, pose: {} },
              { frame: 24, pose: {} },
            ],
          },
        }),
      });

      useProjectStore.getState().setKeyframeEasing(24, "easeInOut");

      const { keyframes } = useProjectStore.getState().project!.timeline;
      expect(keyframes).toEqual([
        { frame: 0, pose: {} },
        { frame: 24, pose: {}, easing: "easeInOut" },
      ]);
    });

    it("setKeyframeEasing leaves other keyframes untouched", () => {
      useProjectStore.setState({
        project: makeProject({
          id: 9,
          timeline: {
            fps: 24,
            keyframes: [
              { frame: 0, pose: {}, easing: "easeInOut" },
              { frame: 24, pose: {} },
            ],
          },
        }),
      });

      useProjectStore.getState().setKeyframeEasing(24, "linear");

      const { keyframes } = useProjectStore.getState().project!.timeline;
      expect(keyframes.find((keyframe) => keyframe.frame === 0)!.easing).toBe("easeInOut");
      expect(keyframes.find((keyframe) => keyframe.frame === 24)!.easing).toBe("linear");
    });

    it("setKeyframeEasing does nothing without an active project", () => {
      useProjectStore.setState({ project: null });

      useProjectStore.getState().setKeyframeEasing(0, "easeInOut");

      expect(useProjectStore.getState().project).toBeNull();
    });

    it("setPlaying(true) advances the playhead frame by frame at the project's fps", () => {
      vi.useFakeTimers();
      useProjectStore.setState({
        project: makeProject({ timeline: { fps: 24, keyframes: [] } }),
        playhead: 0,
        playing: false,
      });

      useProjectStore.getState().setPlaying(true);
      expect(useProjectStore.getState().playing).toBe(true);

      vi.advanceTimersByTime(100);

      expect(useProjectStore.getState().playhead).toBeGreaterThan(0);
    });

    it("playback stops and resets the playhead to 0 once it reaches frame 24", () => {
      vi.useFakeTimers();
      useProjectStore.setState({
        project: makeProject({ timeline: { fps: 24, keyframes: [] } }),
        playhead: 23,
        playing: false,
      });

      useProjectStore.getState().setPlaying(true);
      vi.advanceTimersByTime(200);

      expect(useProjectStore.getState().playhead).toBe(0);
      expect(useProjectStore.getState().playing).toBe(false);
    });

    it("setPlaying(false) stops the playback loop from advancing further", () => {
      vi.useFakeTimers();
      useProjectStore.setState({
        project: makeProject({ timeline: { fps: 24, keyframes: [] } }),
        playhead: 0,
        playing: false,
      });

      useProjectStore.getState().setPlaying(true);
      vi.advanceTimersByTime(50);
      useProjectStore.getState().setPlaying(false);
      const frameAfterStop = useProjectStore.getState().playhead;
      vi.advanceTimersByTime(500);

      expect(useProjectStore.getState().playhead).toBe(frameAfterStop);
    });
  });
});

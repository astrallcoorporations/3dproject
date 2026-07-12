import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../lib/api";
import type { ProjectRecord } from "../types/project";
import { useProjectStore } from "./project-store";

vi.mock("../lib/api", () => ({
  api: {
    createProject: vi.fn(),
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
    vi.mocked(api.uploadAsset).mockReset();
    vi.mocked(api.refineAsset).mockReset();
    useProjectStore.setState({
      project: null,
      mode: "refine",
      contrast: 1.18,
      cleanup: true,
      paletteSize: 12,
      busy: false,
      error: null,
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
});

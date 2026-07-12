import { create } from "zustand";

import { api } from "../lib/api";
import { deriveBones } from "../lib/skeleton";
import type { Asset, JointName, Mode, Point, ProjectRecord, SelectionRect } from "../types/project";

export type RefineSettings = { contrast: number; cleanup: boolean; paletteSize: number };

type ProjectState = {
  project: ProjectRecord | null;
  mode: Mode;
  contrast: number;
  cleanup: boolean;
  paletteSize: number;
  busy: boolean;
  error: string | null;
  activeJoint: JointName;
  selectedBoneId: string | null;
  cropMode: boolean;
};

type ProjectActions = {
  setProject: (project: ProjectRecord | null) => void;
  setMode: (mode: Mode) => void;
  setContrast: (contrast: number) => void;
  setCleanup: (cleanup: boolean) => void;
  setPaletteSize: (paletteSize: number) => void;
  setBusy: (busy: boolean) => void;
  setActiveJoint: (joint: JointName) => void;
  setSelectedBoneId: (boneId: string | null) => void;
  setCropMode: (cropMode: boolean) => void;
  placeJoint: (joint: JointName, point: Point) => void;
  updateSelection: (boneId: string, selection: SelectionRect) => void;
  createProject: (name: string) => Promise<ProjectRecord>;
  uploadAsset: (file: File) => Promise<Asset>;
  refineActiveAsset: (settings: RefineSettings) => Promise<Asset>;
  reset: () => void;
};

export type ProjectStore = ProjectState & ProjectActions;

const initialState: ProjectState = {
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
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...initialState,

  setProject: (project) => set({ project }),
  setMode: (mode) => set({ mode }),
  setContrast: (contrast) => set({ contrast }),
  setCleanup: (cleanup) => set({ cleanup }),
  setPaletteSize: (paletteSize) => set({ paletteSize }),
  setBusy: (busy) => set({ busy }),
  setActiveJoint: (activeJoint) => set({ activeJoint }),
  setSelectedBoneId: (selectedBoneId) => set({ selectedBoneId }),
  setCropMode: (cropMode) => set({ cropMode }),
  reset: () => set({ ...initialState }),

  placeJoint: (joint, point) => {
    const { project } = get();
    if (!project) return;
    const joints = { ...project.rig.joints, [joint]: point };
    set({ project: { ...project, rig: { joints, bones: deriveBones(joints) } } });
  },

  updateSelection: (boneId, selection) => {
    const { project } = get();
    if (!project || selection.width < 0.01 || selection.height < 0.01) return;
    set({
      project: {
        ...project,
        rig: {
          ...project.rig,
          bones: project.rig.bones.map((bone) => (bone.id === boneId ? { ...bone, selection } : bone)),
        },
      },
    });
  },

  createProject: async (name) => {
    const created = await api.createProject(name);
    set({ project: created });
    return created;
  },

  uploadAsset: async (file) => {
    set({ busy: true, error: null });
    try {
      const target = get().project ?? (await get().createProject("Untitled puppet"));
      const asset = await api.uploadAsset(target.id, file);
      set((state) => {
        const current = state.project ?? target;
        return {
          project: { ...current, assets: [...current.assets, asset], activeAssetId: asset.id },
          mode: "refine",
        };
      });
      return asset;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Puppet could not import that image.";
      set({ error: message });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  refineActiveAsset: async (settings) => {
    const { project } = get();
    const activeAsset = project?.assets.find((asset) => asset.id === project.activeAssetId) ?? project?.assets.at(-1);
    if (!project || !activeAsset) {
      const message = "Import artwork before refining.";
      set({ error: message });
      throw new Error(message);
    }
    set({ busy: true, error: null });
    try {
      const refined = await api.refineAsset(activeAsset.id, settings);
      set((state) => {
        const current = state.project ?? project;
        return {
          project: { ...current, assets: [...current.assets, refined], activeAssetId: refined.id },
          mode: "rig",
        };
      });
      return refined;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Puppet could not refine that artwork.";
      set({ error: message });
      throw error;
    } finally {
      set({ busy: false });
    }
  },
}));

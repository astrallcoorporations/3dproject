import { create } from "zustand";

import { api } from "../lib/api";
import { ACTIVE_PROJECT_STORAGE_KEY, safeStorage } from "../lib/local-storage";
import { deriveBones } from "../lib/skeleton";
import type { Asset, BonePose, JointName, Mode, Point, Pose, ProjectRecord, SelectionRect } from "../types/project";

export { ACTIVE_PROJECT_STORAGE_KEY };

export type RefineSettings = { contrast: number; cleanup: boolean; paletteSize: number };

const blankBonePose: BonePose = { rotation: [0, 0, 0], position: [0, 0, 0] };

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
  playhead: number;
  playing: boolean;
  draftPose: Pose;
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
  restoreProject: () => Promise<ProjectRecord | null>;
  uploadAsset: (file: File) => Promise<Asset>;
  refineActiveAsset: (settings: RefineSettings) => Promise<Asset>;
  setPlayhead: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  setDraftPose: (pose: Pose) => void;
  updateDraftPose: (boneId: string, field: "rotation" | "position", axis: number, value: number) => void;
  saveKeyframe: (frame: number) => void;
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
  playhead: 0,
  playing: false,
  draftPose: {},
};

export const useProjectStore = create<ProjectStore>((set, get) => {
  let rafHandle: number | null = null;
  let lastTick: number | null = null;

  const stopPlaybackLoop = () => {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    lastTick = null;
  };

  const step = (time: number) => {
    const { playing, playhead, project } = get();
    if (!playing) {
      stopPlaybackLoop();
      return;
    }
    const fps = project?.timeline.fps ?? 24;
    const frameDuration = 1000 / fps;
    if (lastTick === null) lastTick = time;
    if (time - lastTick >= frameDuration) {
      lastTick += frameDuration;
      if (playhead >= 24) {
        set({ playing: false, playhead: 0 });
        stopPlaybackLoop();
        return;
      }
      set({ playhead: playhead + 1 });
    }
    rafHandle = requestAnimationFrame(step);
  };

  const startPlaybackLoop = () => {
    stopPlaybackLoop();
    rafHandle = requestAnimationFrame(step);
  };

  return {
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

    setPlayhead: (frame) => set({ playhead: frame }),

    setPlaying: (playing) => {
      set({ playing });
      if (playing) {
        startPlaybackLoop();
      } else {
        stopPlaybackLoop();
      }
    },

    setDraftPose: (pose) => set({ draftPose: pose }),

    updateDraftPose: (boneId, field, axis, value) => {
      set((state) => {
        const current = state.draftPose[boneId] ?? blankBonePose;
        const nextAxes = [...current[field]] as [number, number, number];
        nextAxes[axis] = value;
        return { draftPose: { ...state.draftPose, [boneId]: { ...current, [field]: nextAxes } } };
      });
    },

    saveKeyframe: (frame) => {
      const { project, draftPose } = get();
      if (!project || !project.rig.bones.length) return;
      const keyframes = project.timeline.keyframes.filter((keyframe) => keyframe.frame !== frame);
      keyframes.push({ frame, pose: draftPose });
      set({
        project: {
          ...project,
          timeline: { ...project.timeline, keyframes: keyframes.sort((a, b) => a.frame - b.frame) },
        },
      });
    },

    reset: () => {
      stopPlaybackLoop();
      set({ ...initialState });
    },

    placeJoint: (joint, point) => {
      const { project } = get();
      if (!project) return;
      const joints = { ...project.rig.joints, [joint]: point };
      const existing = new Map(project.rig.bones.map((bone) => [bone.id, bone]));
      const bones = deriveBones(joints).map((bone) => ({
        ...bone,
        selection: existing.get(bone.id)?.selection ?? bone.selection,
      }));
      set({ project: { ...project, rig: { joints, bones } } });
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

    restoreProject: async () => {
      if (get().project) return get().project;
      const storedId = safeStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
      if (!storedId) return null;
      try {
        const restored = await api.getProject(Number(storedId));
        if (get().project) return get().project;
        set({ project: restored });
        return restored;
      } catch {
        safeStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
        return null;
      }
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
  };
});

// Keep the active project id mirrored to storage so `restoreProject` can
// find it again after a full page reload. Runs as a subscription (rather
// than inline in every action) so every code path that changes `project`
// — including future ones — stays covered automatically.
useProjectStore.subscribe((state, previous) => {
  if (state.project?.id === previous.project?.id) return;
  if (state.project) {
    safeStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, String(state.project.id));
  } else {
    safeStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
  }
});

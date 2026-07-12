export type Mode = "refine" | "rig" | "animate";

export type JointName =
  | "head"
  | "neck"
  | "leftShoulder"
  | "leftElbow"
  | "leftWrist"
  | "rightShoulder"
  | "rightElbow"
  | "rightWrist"
  | "leftHip"
  | "leftKnee"
  | "leftAnkle"
  | "rightHip"
  | "rightKnee"
  | "rightAnkle";

export type Point = { x: number; y: number };
export type SelectionRect = { x: number; y: number; width: number; height: number };

export type Bone = {
  id: string;
  label: string;
  start: JointName;
  end: JointName;
  parentId: string | null;
  proxyWidth: number;
  selection: SelectionRect;
};

export type Rig = {
  joints: Partial<Record<JointName, Point>>;
  bones: Bone[];
};

export type BonePose = { rotation: [number, number, number]; position: [number, number, number] };
export type Pose = Record<string, BonePose>;
export type Keyframe = { frame: number; pose: Pose };

export type Timeline = { fps: number; keyframes: Keyframe[] };

export type Asset = {
  id: number;
  projectId: number;
  kind: "original" | "refined";
  url: string;
  width: number;
  height: number;
};

export type ProjectRecord = {
  id: number;
  ownerId: "studio-local";
  name: string;
  rig: Rig;
  timeline: Timeline;
  activeAssetId: number | null;
  assets: Asset[];
};

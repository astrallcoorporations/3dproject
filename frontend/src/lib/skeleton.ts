import type { Bone, JointName, Point, SelectionRect } from "../types/project";

type BoneDefinition = Omit<Bone, "selection">;

const definitions: BoneDefinition[] = [
  { id: "neck", label: "Neck", start: "neck", end: "head", parentId: null, proxyWidth: 16 },
  { id: "leftUpperArm", label: "L. upper arm", start: "leftShoulder", end: "leftElbow", parentId: null, proxyWidth: 16 },
  { id: "leftForearm", label: "L. forearm", start: "leftElbow", end: "leftWrist", parentId: "leftUpperArm", proxyWidth: 14 },
  { id: "rightUpperArm", label: "R. upper arm", start: "rightShoulder", end: "rightElbow", parentId: null, proxyWidth: 16 },
  { id: "rightForearm", label: "R. forearm", start: "rightElbow", end: "rightWrist", parentId: "rightUpperArm", proxyWidth: 14 },
  { id: "leftThigh", label: "L. thigh", start: "leftHip", end: "leftKnee", parentId: null, proxyWidth: 20 },
  { id: "leftShin", label: "L. shin", start: "leftKnee", end: "leftAnkle", parentId: "leftThigh", proxyWidth: 16 },
  { id: "rightThigh", label: "R. thigh", start: "rightHip", end: "rightKnee", parentId: null, proxyWidth: 20 },
  { id: "rightShin", label: "R. shin", start: "rightKnee", end: "rightAnkle", parentId: "rightThigh", proxyWidth: 16 },
];

function selectionBetween(start: Point, end: Point): SelectionRect {
  const padding = 0.04;
  const x = Math.max(0, Math.min(start.x, end.x) - padding);
  const y = Math.max(0, Math.min(start.y, end.y) - padding);
  return {
    x,
    y,
    width: Math.min(1 - x, Math.abs(start.x - end.x) + padding * 2),
    height: Math.min(1 - y, Math.abs(start.y - end.y) + padding * 2),
  };
}

export function deriveBones(joints: Partial<Record<JointName, Point>>): Bone[] {
  return definitions.flatMap((definition) => {
    const start = joints[definition.start];
    const end = joints[definition.end];
    if (!start || !end) return [];
    return [{ ...definition, selection: selectionBetween(start, end) }];
  });
}

import { Euler, Quaternion } from "three";

import type { BonePose, Pose } from "../types/project";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function blendBone(a: BonePose, b: BonePose, t: number): BonePose {
  const amount = clamp(t);
  const start = new Quaternion().setFromEuler(new Euler(...a.rotation));
  const end = new Quaternion().setFromEuler(new Euler(...b.rotation));
  const rotation = new Euler().setFromQuaternion(start.slerp(end, amount));
  return {
    rotation: [rotation.x, rotation.y, rotation.z],
    position: a.position.map(
      (value, index) => value + (b.position[index] - value) * amount,
    ) as [number, number, number],
  };
}

export function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  const result: Pose = {};
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  ids.forEach((id) => {
    const first = a[id] ?? b[id];
    const second = b[id] ?? a[id];
    result[id] = blendBone(first, second, t);
  });
  return result;
}

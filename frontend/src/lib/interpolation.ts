import { Euler, Quaternion } from "three";

import type { BonePose, Easing, Pose } from "../types/project";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Shapes a raw 0-1 interpolation fraction into an acceleration curve so
// motion between keyframes reads as weighted animation instead of a robotic
// constant speed. "linear" (the default, for keyframes saved before this
// field existed) passes t straight through.
export function applyEasing(t: number, easing: Easing = "linear"): number {
  const amount = clamp(t);
  if (easing === "easeInOut") {
    return amount < 0.5 ? 4 * amount * amount * amount : 1 - Math.pow(-2 * amount + 2, 3) / 2;
  }
  return amount;
}

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

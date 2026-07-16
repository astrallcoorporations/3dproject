import { describe, expect, it } from "vitest";

import { createDefaultPose, deriveBones } from "./skeleton";

describe("deriveBones", () => {
  it("creates an arm in parent-first order when its joints exist", () => {
    const bones = deriveBones({
      leftShoulder: { x: 0.2, y: 0.3 },
      leftElbow: { x: 0.32, y: 0.5 },
      leftWrist: { x: 0.42, y: 0.66 },
    });

    expect(bones.map((bone) => bone.id)).toEqual(["leftUpperArm", "leftForearm"]);
    expect(bones[0].parentId).toBeNull();
    expect(bones[1].parentId).toBe("leftUpperArm");
  });
});

describe("createDefaultPose", () => {
  const bones = deriveBones({
    leftShoulder: { x: 0.2, y: 0.3 },
    leftElbow: { x: 0.32, y: 0.5 },
    rightShoulder: { x: 0.8, y: 0.3 },
    rightElbow: { x: 0.68, y: 0.5 },
  });

  it("gives every bone a non-identity rotation", () => {
    const pose = createDefaultPose(bones);

    bones.forEach((bone) => {
      const bonePose = pose[bone.id];
      expect(bonePose).toBeDefined();
      const isIdentity = bonePose.rotation.every((value) => value === 0) && bonePose.position.every((value) => value === 0);
      expect(isIdentity).toBe(false);
    });
  });

  it("keeps the yaw within a modest, natural-looking range", () => {
    const pose = createDefaultPose(bones);

    bones.forEach((bone) => {
      const [, yaw] = pose[bone.id].rotation;
      expect(Math.abs(yaw)).toBeGreaterThan(0.05);
      expect(Math.abs(yaw)).toBeLessThan(0.5);
    });
  });

  it("rotates left- and right-prefixed bones in opposite directions", () => {
    const pose = createDefaultPose(bones);

    const leftYaw = pose.leftUpperArm.rotation[1];
    const rightYaw = pose.rightUpperArm.rotation[1];
    expect(Math.sign(leftYaw)).not.toBe(Math.sign(rightYaw));
  });

  it("is deterministic for a given rig", () => {
    expect(createDefaultPose(bones)).toEqual(createDefaultPose(bones));
  });
});

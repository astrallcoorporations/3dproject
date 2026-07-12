import { describe, expect, it } from "vitest";

import { deriveBones } from "./skeleton";

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

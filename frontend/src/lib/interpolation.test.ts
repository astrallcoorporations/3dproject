import { describe, expect, it } from "vitest";

import { interpolatePose } from "./interpolation";

describe("interpolatePose", () => {
  it("slerps rotation and linearly interpolates position", () => {
    const pose = interpolatePose(
      { arm: { rotation: [0, 0, 0], position: [0, 0, 0] } },
      { arm: { rotation: [0, Math.PI, 0], position: [2, 4, 6] } },
      0.5,
    );

    expect(pose.arm.position).toEqual([1, 2, 3]);
    expect(pose.arm.rotation[1]).toBeCloseTo(Math.PI / 2, 5);
  });
});

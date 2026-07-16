import { describe, expect, it } from "vitest";

import { applyEasing, interpolatePose } from "./interpolation";

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

describe("applyEasing", () => {
  it("passes t through unchanged for linear easing", () => {
    expect(applyEasing(0, "linear")).toBe(0);
    expect(applyEasing(0.3, "linear")).toBe(0.3);
    expect(applyEasing(1, "linear")).toBe(1);
  });

  it("defaults to linear when no easing is given", () => {
    expect(applyEasing(0.42)).toBe(0.42);
  });

  it("keeps the endpoints fixed at 0 and 1 for easeInOut", () => {
    expect(applyEasing(0, "easeInOut")).toBeCloseTo(0, 5);
    expect(applyEasing(1, "easeInOut")).toBeCloseTo(1, 5);
  });

  it("eases in-out symmetrically around the midpoint", () => {
    expect(applyEasing(0.5, "easeInOut")).toBeCloseTo(0.5, 5);
  });

  it("accelerates slower near the start than linear motion", () => {
    // Ease-in-out should be slower than linear early in the segment, and
    // faster than linear later in the segment - that's what reads as
    // "weighted" motion instead of a robotic constant speed.
    expect(applyEasing(0.25, "easeInOut")).toBeLessThan(0.25);
    expect(applyEasing(0.75, "easeInOut")).toBeGreaterThan(0.75);
  });

  it("clamps out-of-range t before easing", () => {
    expect(applyEasing(-0.5, "easeInOut")).toBe(0);
    expect(applyEasing(1.5, "easeInOut")).toBe(1);
  });
});

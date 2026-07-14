import { Suspense } from "react";
import { render } from "@testing-library/react";
import * as ReactThreeTestRenderer from "@react-three/test-renderer";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { Pose, Rig } from "../../types/project";
import { ProxyScene, SceneContent } from "./ProxyScene";

// three.js's TextureLoader performs a real image network load, which jsdom cannot
// service. BoneProxy only needs clone()/repeat/offset/dispose on the result, so
// swap in a loader that resolves synchronously to a plain THREE.Texture.
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class FakeTextureLoader {
    load(_url: string, onLoad?: (texture: InstanceType<typeof actual.Texture>) => void) {
      const texture = new actual.Texture();
      onLoad?.(texture);
      return texture;
    }
  }
  return { ...actual, TextureLoader: FakeTextureLoader };
});

beforeAll(async () => {
  // @react-three/test-renderer's `act` doesn't flip this flag itself, which
  // otherwise makes React log a spurious "not configured to support act"
  // warning for every render/event in this file.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // jsdom has no ResizeObserver; react-use-measure (used by @react-three/fiber's
  // Canvas) requires one to exist.
  // @ts-expect-error test polyfill
  global.ResizeObserver ??= ResizeObserverStub;

  // @react-three/test-renderer patches HTMLCanvasElement.prototype.getContext to
  // return a mock WebGL2 context the first time it creates a scene. Warm that up
  // once so ProxyScene's own <Canvas> (mounted via @testing-library/react below)
  // can construct a THREE.WebGLRenderer without crashing under jsdom.
  const warmup = await ReactThreeTestRenderer.create(<mesh />);
  await warmup.unmount();
});

const twoBoneRig: Rig = {
  joints: {
    leftShoulder: { x: 0.2, y: 0.3 },
    leftElbow: { x: 0.3, y: 0.5 },
    leftWrist: { x: 0.35, y: 0.7 },
  },
  bones: [
    {
      id: "leftUpperArm",
      label: "L. upper arm",
      start: "leftShoulder",
      end: "leftElbow",
      parentId: null,
      proxyWidth: 16,
      selection: { x: 0, y: 0, width: 0.2, height: 0.2 },
    },
    {
      id: "leftForearm",
      label: "L. forearm",
      start: "leftElbow",
      end: "leftWrist",
      parentId: "leftUpperArm",
      proxyWidth: 12,
      selection: { x: 0.2, y: 0, width: 0.2, height: 0.2 },
    },
  ],
};

const blankPose: Pose = {};

describe("ProxyScene", () => {
  it("mounts a canvas for a two-bone rig", () => {
    const { container } = render(
      <ProxyScene
        rig={twoBoneRig}
        pose={blankPose}
        activeAssetUrl="http://localhost:5000/uploads/art.png"
        selectedBoneId={null}
        showGrid
        onSelectBone={vi.fn()}
      />,
    );

    expect(container.querySelector("canvas")).toBeTruthy();
  });

  it("lets each bone proxy in a two-bone rig be selected by click", async () => {
    const onSelectBone = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <Suspense fallback={null}>
        <SceneContent
          rig={twoBoneRig}
          pose={blankPose}
          assetUrl="http://localhost:5000/uploads/art.png"
          selectedBoneId={null}
          showGrid={false}
          onSelectBone={onSelectBone}
        />
      </Suspense>,
    );

    // ReactThreeTestInstance#type reflects the underlying THREE.Object3D class
    // name (e.g. "Group", "Mesh"), not the lowercase JSX tag.
    const proxyGroups = renderer.scene.findAllByType("Group");
    expect(proxyGroups).toHaveLength(2);

    await renderer.fireEvent(proxyGroups[0].findByType("Mesh"), "click", {});
    expect(onSelectBone).toHaveBeenCalledWith("leftUpperArm");

    await renderer.fireEvent(proxyGroups[1].findByType("Mesh"), "click", {});
    expect(onSelectBone).toHaveBeenCalledWith("leftForearm");

    await renderer.unmount();
  });
});

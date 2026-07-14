import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";

import type { Pose, Rig } from "../../types/project";
import { BoneProxy } from "./BoneProxy";
import { PerspectiveGrid } from "./PerspectiveGrid";

export type ProxySceneProps = {
  rig: Rig;
  pose: Pose;
  activeAssetUrl: string;
  selectedBoneId: string | null;
  showGrid: boolean;
  onSelectBone: (boneId: string) => void;
};

type SceneContentProps = {
  rig: Rig;
  pose: Pose;
  assetUrl: string;
  selectedBoneId: string | null;
  showGrid: boolean;
  onSelectBone: (boneId: string) => void;
};

export function SceneContent({ rig, pose, assetUrl, selectedBoneId, showGrid, onSelectBone }: SceneContentProps) {
  return (
    <>
      <color attach="background" args={["#171613"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffe1c0" />
      {showGrid && <PerspectiveGrid />}
      {rig.bones.map((bone) => {
        const start = rig.joints[bone.start];
        const end = rig.joints[bone.end];
        return start && end ? (
          <BoneProxy
            key={bone.id}
            bone={bone}
            start={start}
            end={end}
            pose={pose}
            assetUrl={assetUrl}
            selected={bone.id === selectedBoneId}
            onSelect={() => onSelectBone(bone.id)}
          />
        ) : null;
      })}
    </>
  );
}

export function ProxyScene({ activeAssetUrl, ...rest }: ProxySceneProps) {
  return (
    <div className="proxy-scene" aria-label="3D proxy viewport">
      <Canvas camera={{ position: [0, 0, 8], fov: 35 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <SceneContent {...rest} assetUrl={activeAssetUrl} />
        </Suspense>
      </Canvas>
      <span className="scene-compass">PERSPECTIVE / 35°</span>
    </div>
  );
}

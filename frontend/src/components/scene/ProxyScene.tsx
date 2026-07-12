import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { ClampToEdgeWrapping, TextureLoader } from "three";

import type { Bone, Point, Pose, Rig } from "../../types/project";

type ProxySceneProps = {
  rig: Rig;
  pose: Pose;
  assetUrl: string;
  selectedBoneId: string | null;
  showGrid: boolean;
  onSelectBone: (boneId: string) => void;
};

const worldPoint = (point: Point): [number, number] => [(point.x - 0.5) * 6, (0.5 - point.y) * 6];

function BoneProxy({
  bone,
  start,
  end,
  pose,
  assetUrl,
  selected,
  onSelect,
}: {
  bone: Bone;
  start: Point;
  end: Point;
  pose: Pose;
  assetUrl: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const source = useLoader(TextureLoader, assetUrl);
  const croppedTexture = useMemo(() => {
    const texture = source.clone();
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.repeat.set(Math.max(bone.selection.width, 0.04), Math.max(bone.selection.height, 0.04));
    texture.offset.set(bone.selection.x, 1 - bone.selection.y - bone.selection.height);
    texture.needsUpdate = true;
    return texture;
  }, [bone.selection.height, bone.selection.width, bone.selection.x, bone.selection.y, source]);
  useEffect(() => () => croppedTexture.dispose(), [croppedTexture]);

  const [startX, startY] = worldPoint(start);
  const [endX, endY] = worldPoint(end);
  const length = Math.hypot(endX - startX, endY - startY);
  const baseAngle = Math.atan2(endY - startY, endX - startX);
  const transform = pose[bone.id] ?? { rotation: [0, 0, 0] as [number, number, number], position: [0, 0, 0] as [number, number, number] };

  return (
    <group
      position={[(startX + endX) / 2 + transform.position[0], (startY + endY) / 2 + transform.position[1], transform.position[2]}
      rotation={[transform.rotation[0], transform.rotation[1], baseAngle + transform.rotation[2]]}
    >
      {selected && <mesh position={[0, 0, -0.03]}><planeGeometry args={[length + 0.14, bone.proxyWidth / 70 + 0.14]} /><meshBasicMaterial color="#ff6842" /></mesh>}
      <mesh onClick={(event) => { event.stopPropagation(); onSelect(); }}>
        <planeGeometry args={[length, bone.proxyWidth / 70]} />
        <meshStandardMaterial map={croppedTexture} transparent roughness={0.8} metalness={0} side={2} />
      </mesh>
    </group>
  );
}

function SceneContent({ rig, pose, assetUrl, selectedBoneId, showGrid, onSelectBone }: ProxySceneProps) {
  return (
    <>
      <color attach="background" args={["#171613"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffe1c0" />
      {showGrid && <gridHelper args={[12, 12, "#80534a", "#3a332d"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.35]} />}
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

export function ProxyScene(props: ProxySceneProps) {
  return (
    <div className="proxy-scene" aria-label="3D proxy viewport">
      <Canvas camera={{ position: [0, 0, 8], fov: 35 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
      <span className="scene-compass">PERSPECTIVE / 35°</span>
    </div>
  );
}

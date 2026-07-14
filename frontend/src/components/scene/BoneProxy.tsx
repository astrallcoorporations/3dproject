import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { ClampToEdgeWrapping, TextureLoader } from "three";

import type { Bone, Point, Pose } from "../../types/project";

const worldPoint = (point: Point): [number, number] => [(point.x - 0.5) * 6, (0.5 - point.y) * 6];

export type BoneProxyProps = {
  bone: Bone;
  start: Point;
  end: Point;
  pose: Pose;
  assetUrl: string;
  selected: boolean;
  onSelect: () => void;
};

export function BoneProxy({ bone, start, end, pose, assetUrl, selected, onSelect }: BoneProxyProps) {
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
      position={[(startX + endX) / 2 + transform.position[0], (startY + endY) / 2 + transform.position[1], transform.position[2]]}
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

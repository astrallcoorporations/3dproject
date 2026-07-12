import { useRef, useState, type PointerEvent } from "react";

import type { Bone, JointName, Point, Rig, SelectionRect } from "../../types/project";

type JointCanvasProps = {
  imageUrl: string;
  rig: Rig;
  activeJoint: JointName;
  selectedBoneId: string | null;
  cropMode: boolean;
  onJointPlace: (joint: JointName, point: Point) => void;
  onSelectionChange: (boneId: string, selection: SelectionRect) => void;
};

const pointFromEvent = (event: PointerEvent<HTMLDivElement>): Point => {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
  };
};

const rectBetween = (start: Point, end: Point): SelectionRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

function BoneLines({ rig }: { rig: Rig }) {
  return (
    <svg className="rig-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {rig.bones.map((bone) => {
        const start = rig.joints[bone.start];
        const end = rig.joints[bone.end];
        if (!start || !end) return null;
        return <line key={bone.id} x1={start.x * 100} y1={start.y * 100} x2={end.x * 100} y2={end.y * 100} />;
      })}
    </svg>
  );
}

function Selection({ selection }: { selection: SelectionRect }) {
  return (
    <span
      className="selection-box"
      style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }}
    />
  );
}

export function JointCanvas({
  imageUrl,
  rig,
  activeJoint,
  selectedBoneId,
  cropMode,
  onJointPlace,
  onSelectionChange,
}: JointCanvasProps) {
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [preview, setPreview] = useState<SelectionRect | null>(null);
  const selectedBone = rig.bones.find((bone) => bone.id === selectedBoneId);
  const hasDragged = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointFromEvent(event);
    hasDragged.current = false;
    if (cropMode && selectedBone) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragStart(point);
      setPreview({ ...point, width: 0, height: 0 });
      return;
    }
    onJointPlace(activeJoint, point);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    hasDragged.current = true;
    setPreview(rectBetween(dragStart, pointFromEvent(event)));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart && selectedBone && hasDragged.current) {
      onSelectionChange(selectedBone.id, rectBetween(dragStart, pointFromEvent(event)));
    }
    setDragStart(null);
    setPreview(null);
  };

  return (
    <div
      className={`joint-canvas ${cropMode ? "crop-mode" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="application"
      aria-label={cropMode ? "Drag to choose limb art" : `Place ${activeJoint} joint`}
    >
      <img src={imageUrl} alt="Active character art" draggable={false} />
      <BoneLines rig={rig} />
      {selectedBone && <Selection selection={selectedBone.selection} />}
      {preview && <Selection selection={preview} />}
      {Object.entries(rig.joints).map(([name, point]) =>
        point ? (
          <span
            className={`joint-dot ${activeJoint === name ? "active" : ""}`}
            key={name}
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            title={name}
          />
        ) : null,
      )}
    </div>
  );
}

export type { Bone };

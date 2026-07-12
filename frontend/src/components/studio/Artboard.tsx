import type { Asset, JointName, Mode, Point, Rig, SelectionRect } from "../../types/project";
import { JointCanvas } from "./JointCanvas";

type ArtboardProps = {
  assetUrl: string;
  mode: Mode;
  rig: Rig;
  activeJoint: JointName;
  selectedBoneId: string | null;
  cropMode: boolean;
  onPlaceJoint: (joint: JointName, point: Point) => void;
  onSelectionChange: (boneId: string, selection: SelectionRect) => void;
  perspectiveGrid: boolean;
  assetKind?: Asset["kind"];
};

export function Artboard({
  assetUrl,
  mode,
  rig,
  activeJoint,
  selectedBoneId,
  cropMode,
  onPlaceJoint,
  onSelectionChange,
  assetKind,
}: ArtboardProps) {
  if (!assetUrl) {
    return (
      <label className="empty-stage" htmlFor="art-upload">
        <span className="empty-figure">✦</span>
        <strong>Give your character a body.</strong>
        <p>Import a transparent PNG, a clean JPEG, or a scanned drawing to begin.</p>
        <span className="coral-button">Import artwork</span>
      </label>
    );
  }

  if (mode === "rig") {
    return (
      <JointCanvas
        imageUrl={assetUrl}
        rig={rig}
        activeJoint={activeJoint}
        selectedBoneId={selectedBoneId}
        cropMode={cropMode}
        onJointPlace={onPlaceJoint}
        onSelectionChange={onSelectionChange}
      />
    );
  }

  return (
    <div className="refine-stage">
      <div className="paper-note">{assetKind === "refined" ? "ACTIVE REFINED ART" : "ORIGINAL ART"}</div>
      <img src={assetUrl} alt="Artwork prepared for refinement" />
    </div>
  );
}

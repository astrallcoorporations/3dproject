import type { Asset, JointName, Point, Rig } from "../../types/project";

type ArtboardProps = {
  assetUrl: string;
  joints: Rig["joints"];
  onPlaceJoint: (joint: JointName, point: Point) => void;
  perspectiveGrid: boolean;
  assetKind?: Asset["kind"];
};

export function Artboard({ assetUrl, assetKind }: ArtboardProps) {
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

  return (
    <div className="refine-stage">
      <div className="paper-note">{assetKind === "refined" ? "ACTIVE REFINED ART" : "ORIGINAL ART"}</div>
      <img src={assetUrl} alt="Artwork prepared for refinement" />
    </div>
  );
}

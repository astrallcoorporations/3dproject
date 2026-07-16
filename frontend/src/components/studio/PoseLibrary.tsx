import type { Keyframe } from "../../types/project";

type PoseLibraryProps = {
  keyframes: Keyframe[];
  playhead: number;
  onEdit: (frame: number) => void;
  onDelete: (frame: number) => void;
  onReturnToRig: () => void;
};

export function PoseLibrary({ keyframes, playhead, onEdit, onDelete, onReturnToRig }: PoseLibraryProps) {
  const ordered = [...keyframes].sort((a, b) => a.frame - b.frame);

  return (
    <section className="rail-section">
      <h2>Pose library</h2>
      <p className="muted">
        {ordered.length
          ? "Scrub the timeline and save a keyframe to add another pose."
          : "No poses saved yet. Scrub the timeline and save a keyframe to start posing."}
      </p>
      {ordered.map((keyframe) => (
        <div
          className={keyframe.frame === playhead ? "pose-card current" : "pose-card"}
          key={keyframe.frame}
        >
          <span>{String(keyframe.frame).padStart(2, "0")}</span>
          <div>
            <b>Frame {String(keyframe.frame).padStart(2, "0")}</b>
            <small>{keyframe.easing === "easeInOut" ? "Ease in-out" : "Linear"}</small>
          </div>
          <button onClick={() => onEdit(keyframe.frame)} aria-label={`Edit keyframe ${keyframe.frame}`}>
            Edit
          </button>
          <button
            onClick={() => onDelete(keyframe.frame)}
            aria-label={`Delete keyframe ${keyframe.frame}`}
            disabled={ordered.length <= 1}
          >
            Delete
          </button>
        </div>
      ))}
      <button className="text-button" onClick={onReturnToRig}>← Return to rigging</button>
    </section>
  );
}

import type { JointName, Rig } from "../../types/project";

type RigPanelProps = {
  activeJoint: JointName;
  rig: Rig;
  onSelectJoint: (joint: JointName) => void;
  onOpenAnimate: () => void;
};

const jointGroups: Array<{ label: string; joints: Array<[JointName, string]> }> = [
  { label: "TORSO", joints: [["head", "Head"], ["neck", "Neck"]] },
  { label: "LEFT ARM", joints: [["leftShoulder", "Shoulder"], ["leftElbow", "Elbow"], ["leftWrist", "Wrist"]] },
  { label: "RIGHT ARM", joints: [["rightShoulder", "Shoulder"], ["rightElbow", "Elbow"], ["rightWrist", "Wrist"]] },
  { label: "LEFT LEG", joints: [["leftHip", "Hip"], ["leftKnee", "Knee"], ["leftAnkle", "Ankle"]] },
  { label: "RIGHT LEG", joints: [["rightHip", "Hip"], ["rightKnee", "Knee"], ["rightAnkle", "Ankle"]] },
];

export function RigPanel({ activeJoint, rig, onSelectJoint, onOpenAnimate }: RigPanelProps) {
  return (
    <section className="rail-section rig-tools">
      <h2>Joint markers</h2>
      <p className="muted">Choose a joint, then place it on the artboard.</p>
      {jointGroups.map((group) => (
        <div className="joint-group" key={group.label}>
          <span>{group.label}</span>
          {group.joints.map(([id, label]) => (
            <button
              key={id}
              className={activeJoint === id ? "joint-choice active" : "joint-choice"}
              onClick={() => onSelectJoint(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ))}
      <div className="rig-summary">
        <span>{Object.keys(rig.joints).length} joints</span>
        <span>{rig.bones.length} bones</span>
      </div>
      <button className="coral-button full" disabled={!rig.bones.length} onClick={onOpenAnimate}>
        Open animation desk →
      </button>
    </section>
  );
}

import type { Bone, BonePose, Mode, Rig } from "../../types/project";

type InspectorProps = {
  mode: Mode;
  rig: Rig;
  selectedBone: Bone | null;
  selectedBoneId: string | null;
  selectedPose: BonePose;
  cropMode: boolean;
  sketchMode: boolean;
  inspectorOpen: boolean;
  onCropModeChange: (value: boolean) => void;
  onSketchModeChange: (value: boolean) => void;
  onClearSketch: () => void;
  onSelectBone: (boneId: string) => void;
  onPoseChange: (field: "rotation" | "position", axis: number, value: number) => void;
  onCollapse: () => void;
};

export function Inspector({
  mode,
  rig,
  selectedBone,
  selectedBoneId,
  selectedPose,
  cropMode,
  sketchMode,
  inspectorOpen,
  onCropModeChange,
  onSketchModeChange,
  onClearSketch,
  onSelectBone,
  onPoseChange,
  onCollapse,
}: InspectorProps) {
  return (
    <>
      <div className="rail-header">
        <span>INSPECTOR</span>
        <button className="collapse-button" onClick={onCollapse} aria-label="Collapse inspector" aria-expanded={inspectorOpen}>›</button>
      </div>
      {!selectedBone ? (
        <div className="inspector-empty">
          <b>Select a limb</b>
          <p>Place connected joints to create a bone, then choose it here.</p>
        </div>
      ) : (
        <section className="rail-section inspector-content">
          <div className="bone-chip">
            <span>●</span>
            <div>
              <small>SELECTED PROXY</small>
              <b>{selectedBone.label}</b>
            </div>
          </div>
          {mode === "rig" && (
            <>
              <label className="toggle-row">
                <span>Crop limb art<small>Drag on the stage</small></span>
                <input type="checkbox" checked={cropMode} onChange={(event) => onCropModeChange(event.target.checked)} />
              </label>
              <div className="property-row"><span>Proxy width</span><b>{selectedBone.proxyWidth}px</b></div>
            </>
          )}
          {mode === "animate" && (
            <div className="transform-controls">
              <label className="toggle-row">
                <span>Sketch mode<small>Draw on the stage</small></span>
                <input type="checkbox" checked={sketchMode} onChange={(event) => onSketchModeChange(event.target.checked)} />
              </label>
              <button type="button" className="text-button" onClick={onClearSketch}>Clear sketch</button>
              <h3>Pose transform</h3>
              <label>
                Turn / Y <output>{Math.round((selectedPose.rotation[1] * 180) / Math.PI)}°</output>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.01"
                  value={selectedPose.rotation[1]}
                  onChange={(event) => onPoseChange("rotation", 1, Number(event.target.value))}
                />
              </label>
              <label>
                Lean / Z <output>{Math.round((selectedPose.rotation[2] * 180) / Math.PI)}°</output>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.01"
                  value={selectedPose.rotation[2]}
                  onChange={(event) => onPoseChange("rotation", 2, Number(event.target.value))}
                />
              </label>
              <label>
                Camera depth <output>{selectedPose.position[2].toFixed(1)}</output>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.05"
                  value={selectedPose.position[2]}
                  onChange={(event) => onPoseChange("position", 2, Number(event.target.value))}
                />
              </label>
              <p className="inspector-hint">Turn a proxy toward camera to test real perspective foreshortening.</p>
            </div>
          )}
          <div className="bone-list">
            <span>BONES</span>
            {rig.bones.map((bone) => (
              <button key={bone.id} className={bone.id === selectedBoneId ? "selected" : ""} onClick={() => onSelectBone(bone.id)}>
                {bone.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

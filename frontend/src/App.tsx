import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { api } from "./lib/api";
import { interpolatePose } from "./lib/interpolation";
import { ProxyScene } from "./components/scene/ProxyScene";
import { Artboard } from "./components/studio/Artboard";
import { ImportPanel } from "./components/studio/ImportPanel";
import { RefinePanel } from "./components/studio/RefinePanel";
import { RigPanel } from "./components/studio/RigPanel";
import { StudioShell } from "./components/studio/StudioShell";
import { Timeline } from "./components/studio/Timeline";
import { useProjectStore } from "./store/project-store";
import type { BonePose, JointName, Keyframe, Mode, Point, Pose, Rig, SelectionRect } from "./types/project";

const blankRig: Rig = { joints: {}, bones: [] };
const blankPose: Pose = {};
const blankBonePose: BonePose = { rotation: [0, 0, 0], position: [0, 0, 0] };

const poseAtFrame = (keyframes: Keyframe[], frame: number): Pose => {
  const ordered = [...keyframes].sort((a, b) => a.frame - b.frame);
  if (!ordered.length) return blankPose;
  if (frame <= ordered[0].frame) return ordered[0].pose;
  const after = ordered.find((keyframe) => keyframe.frame >= frame);
  if (!after) return ordered[ordered.length - 1].pose;
  const before = [...ordered].reverse().find((keyframe) => keyframe.frame <= frame)!;
  if (before.frame === after.frame) return before.pose;
  return interpolatePose(before.pose, after.pose, (frame - before.frame) / (after.frame - before.frame));
};

export default function App() {
  const project = useProjectStore((state) => state.project);
  const mode = useProjectStore((state) => state.mode);
  const contrast = useProjectStore((state) => state.contrast);
  const cleanup = useProjectStore((state) => state.cleanup);
  const paletteSize = useProjectStore((state) => state.paletteSize);
  const busy = useProjectStore((state) => state.busy);
  const refineError = useProjectStore((state) => state.error);
  const setProject = useProjectStore((state) => state.setProject);
  const setMode = useProjectStore((state) => state.setMode);
  const setContrast = useProjectStore((state) => state.setContrast);
  const setCleanup = useProjectStore((state) => state.setCleanup);
  const setPaletteSize = useProjectStore((state) => state.setPaletteSize);
  const setBusy = useProjectStore((state) => state.setBusy);
  const uploadAsset = useProjectStore((state) => state.uploadAsset);
  const refineActiveAsset = useProjectStore((state) => state.refineActiveAsset);
  const resetProject = useProjectStore((state) => state.reset);
  const activeJoint = useProjectStore((state) => state.activeJoint);
  const setActiveJoint = useProjectStore((state) => state.setActiveJoint);
  const selectedBoneId = useProjectStore((state) => state.selectedBoneId);
  const setSelectedBoneId = useProjectStore((state) => state.setSelectedBoneId);
  const cropMode = useProjectStore((state) => state.cropMode);
  const setCropMode = useProjectStore((state) => state.setCropMode);
  const storePlaceJoint = useProjectStore((state) => state.placeJoint);
  const storeUpdateSelection = useProjectStore((state) => state.updateSelection);
  const playhead = useProjectStore((state) => state.playhead);
  const playing = useProjectStore((state) => state.playing);
  const draftPose = useProjectStore((state) => state.draftPose);
  const setPlayhead = useProjectStore((state) => state.setPlayhead);
  const setPlaying = useProjectStore((state) => state.setPlaying);
  const setDraftPose = useProjectStore((state) => state.setDraftPose);
  const storeUpdateDraftPose = useProjectStore((state) => state.updateDraftPose);
  const storeSaveKeyframe = useProjectStore((state) => state.saveKeyframe);

  const [showGrid, setShowGrid] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  const [notice, setNotice] = useState("Import artwork to begin a new puppet.");

  const rig = project?.rig ?? blankRig;
  const timeline = project?.timeline ?? { fps: 24, keyframes: [] };
  const activeAsset = project?.assets.find((asset) => asset.id === project.activeAssetId) ?? project?.assets.at(-1);
  const assetUrl = api.assetUrl(activeAsset);
  const selectedBone = rig.bones.find((bone) => bone.id === selectedBoneId) ?? null;
  const canAnimate = !!activeAsset && rig.bones.length > 0;
  const viewportPose = playing ? poseAtFrame(timeline.keyframes, playhead) : draftPose;
  const selectedPose = selectedBone ? (draftPose[selectedBone.id] ?? blankBonePose) : blankBonePose;

  useEffect(() => {
    if (!selectedBoneId || !rig.bones.some((bone) => bone.id === selectedBoneId)) {
      setSelectedBoneId(rig.bones[0]?.id ?? null);
    }
  }, [rig.bones, selectedBoneId]);

  useEffect(() => {
    if (!project || !rig.bones.length || timeline.keyframes.length) return;
    setProject({
      ...project,
      timeline: { fps: 24, keyframes: [{ frame: 0, pose: {} }, { frame: 24, pose: {} }] },
    });
    setNotice("Rig ready. Pose frame 0, save it, then create a contrasting pose at frame 24.");
  }, [project, rig.bones.length, timeline.keyframes.length]);

  useEffect(() => {
    if (!playing) setDraftPose(poseAtFrame(timeline.keyframes, playhead));
  }, [playhead, playing, timeline.keyframes, setDraftPose]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setNotice("Choose an image smaller than 12 MB.");
      return;
    }
    try {
      await uploadAsset(file);
      setNotice("Artwork imported. Use cleanup if this began as a scan, or move straight into rigging.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Puppet could not import that image.");
    }
  };

  const refine = async () => {
    if (!activeAsset) return;
    try {
      await refineActiveAsset({ contrast, cleanup, paletteSize });
      setNotice("Refinement applied. The cleaned art is now your active rigging source.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Puppet could not refine that artwork.");
    }
  };

  const placeJoint = (joint: JointName, point: Point) => {
    if (!project) return;
    storePlaceJoint(joint, point);
    setNotice(`${joint.replace(/([A-Z])/g, " $1")} placed.`);
  };

  const updateSelection = (boneId: string, selection: SelectionRect) => {
    if (!project || selection.width < 0.01 || selection.height < 0.01) return;
    storeUpdateSelection(boneId, selection);
    setNotice("Limb art crop updated.");
  };

  const updateSelectedPose = (field: "rotation" | "position", axis: number, value: number) => {
    if (!selectedBone) return;
    storeUpdateDraftPose(selectedBone.id, field, axis, value);
  };

  const saveKeyframe = () => {
    if (!project || !rig.bones.length) return;
    storeSaveKeyframe(playhead);
    setNotice(`Pose saved at frame ${playhead}.`);
  };

  const persist = async () => {
    if (!project) return;
    setBusy(true);
    try {
      setProject(await api.updateProject(project.id, { rig: project.rig, timeline: project.timeline, activeAssetId: project.activeAssetId ?? undefined }));
      setNotice("Rig and timeline saved to Local Studio.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Puppet could not save this project.");
    } finally {
      setBusy(false);
    }
  };

  const stage = useMemo(() => {
    if (activeAsset && mode === "animate") {
      return <ProxyScene rig={rig} pose={viewportPose} assetUrl={assetUrl} selectedBoneId={selectedBoneId} showGrid={showGrid} onSelectBone={setSelectedBoneId} />;
    }
    return (
      <Artboard
        assetUrl={assetUrl}
        mode={mode}
        rig={rig}
        activeJoint={activeJoint}
        selectedBoneId={selectedBoneId}
        cropMode={cropMode}
        onPlaceJoint={placeJoint}
        onSelectionChange={updateSelection}
        perspectiveGrid={showGrid}
        assetKind={activeAsset?.kind}
      />
    );
  }, [activeAsset, activeJoint, assetUrl, cropMode, mode, rig, selectedBoneId, showGrid, viewportPose]);

  const leftRail = (
    <>
      <div className="rail-header"><span>WORKFLOW</span><b>{mode === "refine" ? "01" : mode === "rig" ? "02" : "03"}</b></div>
      {mode === "refine" && <section className="rail-section">
        <ImportPanel hasActiveAsset={!!activeAsset} />
        <RefinePanel
          hasActiveAsset={!!activeAsset}
          contrast={contrast}
          cleanup={cleanup}
          paletteSize={paletteSize}
          busy={busy}
          error={refineError}
          onContrastChange={setContrast}
          onCleanupChange={setCleanup}
          onPaletteSizeChange={setPaletteSize}
          onApply={refine}
          onSkip={() => setMode("rig")}
        />
      </section>}
      {mode === "rig" && (
        <RigPanel
          activeJoint={activeJoint}
          rig={rig}
          onSelectJoint={(joint) => {
            setActiveJoint(joint);
            setCropMode(false);
          }}
          onOpenAnimate={() => setMode("animate")}
        />
      )}
      {mode === "animate" && <section className="rail-section">
        <h2>Pose library</h2><p className="muted">Two keys, one believable in-between.</p>
        <div className="pose-card"><span>A</span><div><b>Frame 00</b><small>{timeline.keyframes.find((keyframe) => keyframe.frame === 0) ? "Keyed" : "Unkeyed"}</small></div><button onClick={() => setPlayhead(0)}>Edit</button></div>
        <div className="pose-card"><span>B</span><div><b>Frame 24</b><small>{timeline.keyframes.find((keyframe) => keyframe.frame === 24) ? "Keyed" : "Unkeyed"}</small></div><button onClick={() => setPlayhead(24)}>Edit</button></div>
        <button className="text-button" onClick={() => setMode("rig")}>← Return to rigging</button>
      </section>}
    </>
  );

  const inspector = (
    <>
      <div className="rail-header"><span>INSPECTOR</span><button className="collapse-button" onClick={() => setInspectorOpen(false)} aria-label="Collapse inspector">›</button></div>
      {!selectedBone ? <div className="inspector-empty"><b>Select a limb</b><p>Place connected joints to create a bone, then choose it here.</p></div> : <section className="rail-section inspector-content">
        <div className="bone-chip"><span>●</span><div><small>SELECTED PROXY</small><b>{selectedBone.label}</b></div></div>
        {mode === "rig" && <><label className="toggle-row"><span>Crop limb art<small>Drag on the stage</small></span><input type="checkbox" checked={cropMode} onChange={(event) => setCropMode(event.target.checked)} /></label><div className="property-row"><span>Proxy width</span><b>{selectedBone.proxyWidth}px</b></div></>}
        {mode === "animate" && <div className="transform-controls">
          <h3>Pose transform</h3>
          <label>Turn / Y <output>{Math.round((selectedPose.rotation[1] * 180) / Math.PI)}°</output><input type="range" min={-Math.PI} max={Math.PI} step="0.01" value={selectedPose.rotation[1]} onChange={(event) => updateSelectedPose("rotation", 1, Number(event.target.value))} /></label>
          <label>Lean / Z <output>{Math.round((selectedPose.rotation[2] * 180) / Math.PI)}°</output><input type="range" min={-Math.PI} max={Math.PI} step="0.01" value={selectedPose.rotation[2]} onChange={(event) => updateSelectedPose("rotation", 2, Number(event.target.value))} /></label>
          <label>Camera depth <output>{selectedPose.position[2].toFixed(1)}</output><input type="range" min="-2" max="2" step="0.05" value={selectedPose.position[2]} onChange={(event) => updateSelectedPose("position", 2, Number(event.target.value))} /></label>
          <p className="inspector-hint">Turn a proxy toward camera to test real perspective foreshortening.</p>
        </div>}
        <div className="bone-list"><span>BONES</span>{rig.bones.map((bone) => <button key={bone.id} className={bone.id === selectedBoneId ? "selected" : ""} onClick={() => setSelectedBoneId(bone.id)}>{bone.label}</button>)}</div>
      </section>}
    </>
  );

  const topbar = <>
    <div className="brand"><i>✦</i><span>PUPPET</span></div>
    <div className="project-name"><small>LOCAL STUDIO</small><b>{project?.name ?? "New character"}</b></div>
    <nav className="mode-switcher" aria-label="Studio mode">{(["refine", "rig", "animate"] as Mode[]).map((item) => {
      const disabled = item === "animate" ? !canAnimate : !activeAsset;
      return (
        <button key={item} className={mode === item ? "current" : ""} disabled={disabled} onClick={() => {
          if (disabled) {
            setNotice(item === "animate" ? "Create a rig before opening Animate." : "Import artwork before opening that desk.");
            return;
          }
          setMode(item);
        }}>
          {item}
        </button>
      );
    })}</nav>
    <div className="top-actions"><button className="grid-button" onClick={() => setShowGrid(!showGrid)} aria-pressed={showGrid}>⌘ Grid</button><button className="save-button" disabled={!project || busy} onClick={persist}>Save local</button><button className="avatar" onClick={() => { resetProject(); setNotice("A fresh puppet is ready for artwork."); }} aria-label="Start a new puppet">+</button></div>
  </>;

  const timelinePanel = rig.bones.length ? <Timeline frame={playhead} keyframes={timeline.keyframes} playing={playing} onFrameChange={(frame) => { setPlaying(false); setPlayhead(frame); }} onPlayToggle={() => { if (!timeline.keyframes.length) setNotice("Place joints and save a pose first."); else setPlaying(!playing); }} onSaveKeyframe={saveKeyframe} /> : <div className="timeline dormant"><div className="timeline-toolbar"><span>POSE TIMELINE</span><em>Build a connected rig to unlock 24 fps playback.</em></div></div>;

  return <>
    <input id="art-upload" className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
    <StudioShell topbar={topbar} leftRail={leftRail} stage={<><div className="stage-bar"><span>{mode === "refine" ? "ART PREP" : mode === "rig" ? "SKELETON MAP" : "PROXY VIEWPORT"}</span><span>{mode === "rig" && cropMode ? "DRAG TO CROP SELECTED LIMB" : notice}</span><button onClick={() => setRailOpen(!railOpen)} aria-label="Toggle tools">☰</button></div>{stage}</>} inspector={inspector} timeline={timelinePanel} inspectorOpen={inspectorOpen} railOpen={railOpen} />
    {!inspectorOpen && <button className="reveal-inspector" onClick={() => setInspectorOpen(true)}>‹ Inspector</button>}
  </>;
}

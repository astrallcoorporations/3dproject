import type { Mode } from "../../types/project";

type TopBarProps = {
  projectName: string;
  mode: Mode;
  canAnimate: boolean;
  hasActiveAsset: boolean;
  showGrid: boolean;
  saveDisabled: boolean;
  onModeChange: (mode: Mode) => void;
  onToggleGrid: () => void;
  onSave: () => void;
  onNewPuppet: () => void;
};

const modes: Mode[] = ["refine", "rig", "animate"];

export function TopBar({
  projectName,
  mode,
  canAnimate,
  hasActiveAsset,
  showGrid,
  saveDisabled,
  onModeChange,
  onToggleGrid,
  onSave,
  onNewPuppet,
}: TopBarProps) {
  return (
    <>
      <div className="brand"><i>✦</i><span>PUPPET</span></div>
      <div className="project-name"><small>LOCAL STUDIO</small><b>{projectName}</b></div>
      <nav className="mode-switcher" aria-label="Studio mode">
        {modes.map((item) => {
          const disabled = item === "animate" ? !canAnimate : !hasActiveAsset;
          return (
            <button key={item} className={mode === item ? "current" : ""} disabled={disabled} onClick={() => onModeChange(item)}>
              {item}
            </button>
          );
        })}
      </nav>
      <div className="top-actions">
        <button className="grid-button" onClick={onToggleGrid} aria-pressed={showGrid}>⌘ Grid</button>
        <button className="save-button" disabled={saveDisabled} onClick={onSave}>Save local</button>
        <button className="avatar" onClick={onNewPuppet} aria-label="Start a new puppet">+</button>
      </div>
    </>
  );
}

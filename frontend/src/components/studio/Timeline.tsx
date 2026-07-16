import type { CSSProperties, PointerEvent } from "react";

import type { Easing, Keyframe } from "../../types/project";

type TimelineProps = {
  frame: number;
  keyframes: Keyframe[];
  playing: boolean;
  onFrameChange: (frame: number) => void;
  onPlayToggle: () => void;
  onSaveKeyframe: () => void;
  onEasingChange: (easing: Easing) => void;
};

const frameStyle = (frame: number): CSSProperties => ({ "--frame-position": `${(frame / 24) * 100}%` } as CSSProperties);

export function Timeline({ frame, keyframes, playing, onFrameChange, onPlayToggle, onSaveKeyframe, onEasingChange }: TimelineProps) {
  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onFrameChange(Math.round(Math.max(0, Math.min(24, ((event.clientX - rect.left) / rect.width) * 24))));
  };

  const currentKeyframe = keyframes.find((keyframe) => keyframe.frame === frame);

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <div className="transport">
          <button className="icon-button" onClick={() => onFrameChange(0)} aria-label="Go to first frame">|‹</button>
          <button className="play-button" onClick={onPlayToggle} aria-label={playing ? "Pause playback" : "Play animation"}>{playing ? "Ⅱ" : "▶"}</button>
          <span><b>{String(frame).padStart(2, "0")}</b> / 24</span>
        </div>
        <div className="timeline-title"><span className="record-dot" />POSE TIMELINE <em>24 FPS</em></div>
        <select
          className="quiet-select"
          aria-label="Easing for current keyframe"
          disabled={!currentKeyframe}
          value={currentKeyframe?.easing ?? "linear"}
          onChange={(event) => onEasingChange(event.target.value as Easing)}
        >
          <option value="linear">Linear</option>
          <option value="easeInOut">Ease in-out</option>
        </select>
        <button className="quiet-button" onClick={onSaveKeyframe}>Save keyframe</button>
      </div>
      <div className="ruler" onPointerDown={scrub} onPointerMove={(event) => event.buttons === 1 && scrub(event)}>
        {Array.from({ length: 13 }, (_, index) => index * 2).map((tick) => <span key={tick} style={{ left: `${(tick / 24) * 100}%` }}>{tick}</span>)}
      </div>
      <div className="tracks" onPointerDown={scrub} onPointerMove={(event) => event.buttons === 1 && scrub(event)}>
        <div className="track-label">MASTER POSE</div>
        <div className="track-line" />
        {keyframes.map((keyframe) => <button className="keyframe" key={keyframe.frame} style={frameStyle(keyframe.frame)} onClick={() => onFrameChange(keyframe.frame)} aria-label={`Go to keyframe ${keyframe.frame}`} />)}
        <div className="playhead" style={frameStyle(frame)}><i /></div>
      </div>
    </div>
  );
}

type RefinePanelProps = {
  hasActiveAsset: boolean;
  contrast: number;
  cleanup: boolean;
  paletteSize: number;
  busy: boolean;
  error: string | null;
  onContrastChange: (value: number) => void;
  onCleanupChange: (value: boolean) => void;
  onPaletteSizeChange: (value: number) => void;
  onApply: () => void;
  onSkip: () => void;
};

export function RefinePanel({
  hasActiveAsset,
  contrast,
  cleanup,
  paletteSize,
  busy,
  error,
  onContrastChange,
  onCleanupChange,
  onPaletteSizeChange,
  onApply,
  onSkip,
}: RefinePanelProps) {
  return (
    <>
      <div className="control-block">
        <label>
          Contrast <output>{contrast.toFixed(2)}×</output>
        </label>
        <input
          type="range"
          min="0.7"
          max="1.7"
          step="0.01"
          value={contrast}
          onChange={(event) => onContrastChange(Number(event.target.value))}
        />
      </div>
      <label className="toggle-row">
        <span>
          Line cleanup<small>Reduce scan noise</small>
        </span>
        <input type="checkbox" checked={cleanup} onChange={(event) => onCleanupChange(event.target.checked)} />
      </label>
      <div className="control-block">
        <label>
          Palette <output>{paletteSize} colors</output>
        </label>
        <input
          type="range"
          min="4"
          max="32"
          step="4"
          value={paletteSize}
          onChange={(event) => onPaletteSizeChange(Number(event.target.value))}
        />
      </div>
      <button className="coral-button full" disabled={!hasActiveAsset || busy} onClick={onApply}>
        {busy ? "Refining…" : "Apply cleanup"}
      </button>
      <button className="text-button" disabled={!hasActiveAsset} onClick={onSkip}>
        Skip to rigging →
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

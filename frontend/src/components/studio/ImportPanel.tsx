type ImportPanelProps = {
  hasActiveAsset: boolean;
};

export function ImportPanel({ hasActiveAsset }: ImportPanelProps) {
  return (
    <>
      <h2>Source art</h2>
      <p className="muted">Keep the original. Puppet creates a cleaned copy when you refine.</p>
      <label className="upload-card" htmlFor="art-upload">
        <span>↥</span>
        <b>{hasActiveAsset ? "Replace artwork" : "Choose artwork"}</b>
        <small>PNG · JPEG · WebP</small>
      </label>
    </>
  );
}

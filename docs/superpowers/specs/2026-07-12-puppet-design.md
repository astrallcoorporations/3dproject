# Puppet — Base Rig Studio Design

## Goal

Puppet is a single-character, browser-based 2D animation rigging studio. A creator imports transparent art, optionally cleans up a scan, marks a humanoid skeleton, poses 3D limb proxies in two keyframes, previews the interpolation, and saves the reusable rig locally.

## Product shape

The application is a dense desktop-first studio workbench, not a sequence of dashboard cards. It has three progressive modes in one stable layout: **Refine**, **Rig**, and **Animate**. Mode changes preserve the source image, the selected bone, and the viewport position.

The workspace uses a near-black ink shell, a warm paper artboard, acid coral for active controls, mist-blue for secondary state, and highly legible editorial display type paired with a compact technical sans. The frame intentionally prioritizes the timeline: at a 1440×900 viewport it occupies 260 px, with a 40 px transport/track header and 220 px for frame lanes. It can be resized from 200–420 px. The main viewport has the remaining height, while both side panels are collapsible.

## Layout

- **Top bar (52 px):** Puppet mark, project name/status, the three modes, import/refine/export actions, and local-Studio avatar.
- **Left rail (272 px, collapsible):** source asset, cleanup settings in Refine mode, skeleton joint palette in Rig mode, and bone selection in Animate mode.
- **Center stage:** a warm paper 2D artboard while placing joints and a live 3D proxy viewport while animating. The perspective grid can be enabled in either mode.
- **Right inspector (292 px, collapsible):** context-sensitive selected-bone transform controls, proxy geometry settings, and per-frame interpolation values.
- **Bottom timeline (260 px, resizable):** transport controls, frame ruler, two pose lanes, playhead, draggable keyframes, and empty-state instruction. It remains visible in every mode after a rig exists.

At widths below 1100 px, the inspector starts collapsed. Below 900 px, the left rail becomes a temporary drawer; the editor remains technically usable but is optimized for desktop screens.

## Functional scope

### Import and refinement

The client accepts PNG, JPEG, and WebP files up to 12 MB. It displays the untouched source next to a refined preview. Refinement is deterministic: contrast adjustment, grayscale-safe line cleanup (denoise → adaptive threshold → alpha-aware composite), and palette reduction to 4–32 colors. Applying refinement creates a saved PNG asset and makes it the active source for rigging; the original is retained in the local project record.

### Rigging

The Rig stage overlays joint markers on the active image. A compact palette provides the standard humanoid joints. Each click places or replaces that named joint. The server/client-independent skeleton module derives valid parent-child bones from the joint map: neck→head, shoulder→elbow→wrist, hip→knee→ankle, plus shoulder/hip crossbones when both endpoints exist. Each bone has default proxy width, image-space bounds, and a selected state. The selection tool lets the user drag an image-space rectangle per bone; the rectangle is used to crop a front-facing limb texture.

### Pose and preview

The Animate stage renders one card-like proxy per bone with react-three-fiber. A bone transform is stored as `{ rotation: [x,y,z], position: [x,y,z] }`. At each keyframe, the complete pose is captured. Frames 0 and 24 are created automatically after a rig is first built. Playback samples a normalized timeline value, uses quaternion slerp for rotation and linear interpolation for position, and updates the proxy scene at 24 fps. A toggleable one-point perspective grid is rendered in the 2D and 3D views; the 3D camera is a fixed perspective camera so rotated cards visibly foreshorten.

### Persistence

The Flask service uses SQLite by default for this standalone build while keeping SQLAlchemy models Postgres-compatible. A built-in `studio-local` user owns all projects. Rig JSON, keyframes, assets, and selection bounds are saved through REST endpoints. Reloading a project restores its active asset, rig, and timeline.

## Boundaries

- No authentication screen, cloud storage, pixel-perfect masking, PSD, motion library, multi-character scenes, physics, ML/LoRA style transfer, or final video export.
- Cleanup is useful image processing, not style imitation.
- The 3D limb representation is a card proxy for the MVP; its transforms and camera math form the foundation for later volumetric geometry.

## Quality bar

- Python services have pytest coverage for image refinement, skeleton derivation, payload validation, and persistence routes.
- TypeScript tests cover skeleton generation, interpolation, and timeline behavior.
- A browser smoke test verifies upload → refine → rig → keyframe → playback → reload.
- Controls are keyboard reachable, labeled, and show an in-context error state instead of silently failing.

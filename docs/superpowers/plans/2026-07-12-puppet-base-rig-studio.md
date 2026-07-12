# Puppet Base Rig Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Puppet, a local-first Flask and React studio that imports and cleans character art, creates a rig, animates two poses, and persists the result.

**Architecture:** The Flask API owns image cleanup, asset persistence, and project JSON. The Vite React client owns all interactive editing state, renders the 2D rigging canvas and 3D proxy scene, then writes stable project snapshots to the API. Shared JSON contracts are duplicated deliberately as Pydantic/TypeScript types because the apps deploy independently.

**Tech Stack:** Python 3.14, Flask, Flask-SQLAlchemy, Pillow, NumPy, OpenCV; React 19, TypeScript, Vite, Zustand, react-three-fiber, Three.js, Vitest, pytest.

## Global Constraints

- Use local built-in owner ID `studio-local`; do not add authentication UI.
- Store binary assets below `backend/instance/uploads`; store relative URLs in the database.
- Accept PNG/JPEG/WebP uploads no larger than 12 MB.
- Preserve originals; cleanup must write a new PNG asset.
- Provide a 24 fps preview and auto-create keyframes at frames 0 and 24 after rig creation.
- Treat the 2D proxy cards as an MVP foundation; do not add mesh deformation or ML style transfer.

## File Structure

- `backend/app/__init__.py`: Flask factory and extension configuration.
- `backend/app/models.py`: SQLAlchemy `Project` and `Asset` persistence models.
- `backend/app/schemas.py`: request validation and API serialization helpers.
- `backend/app/image_refinement.py`: deterministic image processing operations.
- `backend/app/routes/projects.py`: project, asset, refinement, and rig REST routes.
- `backend/tests/`: isolated API and image pipeline tests.
- `frontend/src/types/project.ts`: editor contracts.
- `frontend/src/lib/skeleton.ts`: joint to bone derivation.
- `frontend/src/lib/interpolation.ts`: pure pose interpolation.
- `frontend/src/store/project-store.ts`: editor state and API synchronization.
- `frontend/src/components/studio/*`: shell, rails, stage, timeline, and 2D rigging controls.
- `frontend/src/components/scene/ProxyScene.tsx`: Three.js proxy viewport.
- `frontend/src/styles.css`: visual tokens and responsive studio layout.

---

### Task 1: Bootstrap the split application and health API

**Files:**
- Create: `backend/requirements.txt`, `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/routes/health.py`, `backend/run.py`, `backend/tests/test_health.py`
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/styles.css`

**Interfaces:**
- Produces `create_app(test_config: dict | None = None) -> Flask` and `GET /api/health -> {"status": "ok"}`.

- [ ] **Step 1: Write the failing backend health test.**

```python
from app import create_app

def test_health_returns_ok():
    client = create_app({"TESTING": True}).test_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}
```

- [ ] **Step 2: Run `python -m pytest tests/test_health.py -v` from `backend`; expect import failure.**
- [ ] **Step 3: Implement the factory, CORS-enabled route registration, and minimal Vite entry that renders `Puppet`.**
- [ ] **Step 4: Run the pytest command; expect one passing test. Run `npm run build` from `frontend`; expect a production bundle.**
- [ ] **Step 5: Commit the bootstrap files with `feat: scaffold puppet studio`.**

### Task 2: Add project and asset persistence

**Files:**
- Create: `backend/app/models.py`, `backend/app/routes/projects.py`, `backend/tests/test_projects.py`
- Modify: `backend/app/__init__.py`, `backend/app/config.py`

**Interfaces:**
- Produces `Project` with `id`, `owner_id`, `name`, `rig_json`, `timeline_json`, `active_asset_id` and `Asset` with `id`, `project_id`, `kind`, `relative_path`, `width`, `height`.
- Produces `POST /api/projects`, `GET /api/projects/<id>`, and `PUT /api/projects/<id>`.

- [ ] **Step 1: Write a failing test that posts `{ "name": "Nova" }`, then gets the returned ID and asserts `ownerId == "studio-local"` and `rig == {}`.**
- [ ] **Step 2: Run `python -m pytest tests/test_projects.py -v`; expect route-not-found failure.**
- [ ] **Step 3: Implement models with `db.create_all()` in the factory and route serializers that emit camelCase JSON. Validate project names as 1–80 non-whitespace characters and return `{ "error": "..." }` with 400 for malformed payloads.**
- [ ] **Step 4: Re-run the focused test, then `python -m pytest -v`; expect all passing.**
- [ ] **Step 5: Commit with `feat: persist local studio projects`.**

### Task 3: Implement safe upload and deterministic refinement

**Files:**
- Create: `backend/app/image_refinement.py`, `backend/tests/test_image_refinement.py`, `backend/tests/test_assets.py`
- Modify: `backend/app/routes/projects.py`, `backend/app/config.py`

**Interfaces:**
- Produces `refine_image(source: Path, destination: Path, settings: RefinementSettings) -> ImageMeta`.
- Produces `POST /api/projects/<id>/assets` multipart upload and `POST /api/assets/<id>/refine` with `{contrast: number, cleanup: boolean, paletteSize: 4..32}`.

- [ ] **Step 1: Write failing tests using a 32×32 RGBA Pillow image: refinement writes a PNG with the same dimensions and non-empty alpha; an upload larger than the configured size returns 413.**
- [ ] **Step 2: Run `python -m pytest tests/test_image_refinement.py tests/test_assets.py -v`; expect missing-function/route failures.**
- [ ] **Step 3: Implement `ImageOps.autocontrast`, a 3×3 median denoise plus adaptive threshold on non-transparent grayscale pixels, and Pillow `quantize(colors=palette_size, method=Image.Quantize.MEDIANCUT)` composited back through the original alpha channel. Save originals and refinements with UUID names.**
- [ ] **Step 4: Run the focused tests and `python -m pytest -v`; expect all passing.**
- [ ] **Step 5: Commit with `feat: add deterministic art cleanup`.**

### Task 4: Define the frontend project contracts and API client

**Files:**
- Create: `frontend/src/types/project.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/skeleton.ts`, `frontend/src/lib/skeleton.test.ts`

**Interfaces:**
- Defines `JointName`, `Joint`, `Bone`, `Rig`, `BonePose`, `Keyframe`, and `ProjectRecord`.
- Produces `deriveBones(joints: Record<JointName, Joint | undefined>): Bone[]`.

- [ ] **Step 1: Write a failing Vitest test asserting shoulder/elbow/wrist coordinates produce exactly `leftUpperArm` and `leftForearm` in parent-first order.**
- [ ] **Step 2: Run `npm run test -- skeleton.test.ts`; expect module failure.**
- [ ] **Step 3: Implement an explicit parent-child definition table for head, both arms, and both legs. Only emit a bone if both endpoints exist; set `proxyWidth` to 16 and `selection` to the endpoint bounding rectangle. Add typed fetch wrappers matching the Flask response payloads.**
- [ ] **Step 4: Re-run the test and `npm run test`; expect passing tests.**
- [ ] **Step 5: Commit with `feat: add editor rig contracts`.**

### Task 5: Build local editor state and image/refinement flow

**Files:**
- Create: `frontend/src/store/project-store.ts`, `frontend/src/components/studio/ImportPanel.tsx`, `frontend/src/components/studio/RefinePanel.tsx`, `frontend/src/components/studio/Artboard.tsx`, `frontend/src/store/project-store.test.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces store methods `createProject(name)`, `uploadAsset(file)`, `refineActiveAsset(settings)`, and `setMode(mode)`.
- `Artboard` consumes `{assetUrl, joints, onPlaceJoint, perspectiveGrid}`.

- [ ] **Step 1: Write a store test that mocks `api.createProject` and asserts a created record becomes active; write a component test that an imported image is shown with an accessible alt label.**
- [ ] **Step 2: Run the focused Vitest tests; expect failures because the store and components do not exist.**
- [ ] **Step 3: Implement the import drop zone, before/after refinement preview, contrast slider, cleanup toggle, palette stepper, and Apply/Skip actions. Disable Apply only while the request is active; surface API error text beside the action.**
- [ ] **Step 4: Re-run focused tests and full frontend test suite; expect passing tests.**
- [ ] **Step 5: Commit with `feat: add import and art refinement workflow`.**

### Task 6: Create the 2D joint-marker and selection workflow

**Files:**
- Create: `frontend/src/components/studio/RigPanel.tsx`, `frontend/src/components/studio/JointCanvas.tsx`, `frontend/src/components/studio/JointCanvas.test.tsx`
- Modify: `frontend/src/store/project-store.ts`, `frontend/src/components/studio/Artboard.tsx`

**Interfaces:**
- `JointCanvas` consumes an image, `Record<JointName, Joint | undefined>`, selected joint name, `onJointPlace(name, point)`, and `onSelectionChange(boneId, rect)`.
- Produces saved `Rig` with derived bones and per-bone image-space selection rectangles.

- [ ] **Step 1: Write a component test that selects `leftElbow`, clicks image-relative `(0.25, 0.5)`, and expects a marker at 25%/50%; test that completing shoulder/elbow creates `leftUpperArm`.**
- [ ] **Step 2: Run the test; expect component-not-found failure.**
- [ ] **Step 3: Implement an SVG overlay with named marker buttons, click-to-place normalized coordinates, parent-child bone strokes, and a drag rectangle for the selected bone. Persist the draft rig through `PUT /api/projects/<id>`.**
- [ ] **Step 4: Run all frontend tests; expect passing tests.**
- [ ] **Step 5: Commit with `feat: add interactive 2d rigging`.**

### Task 7: Add pure keyframe interpolation and timeline state

**Files:**
- Create: `frontend/src/lib/interpolation.ts`, `frontend/src/lib/interpolation.test.ts`, `frontend/src/components/studio/Timeline.tsx`, `frontend/src/components/studio/Timeline.test.tsx`
- Modify: `frontend/src/store/project-store.ts`

**Interfaces:**
- Produces `interpolatePose(a: Pose, b: Pose, t: number): Pose` and store methods `saveKeyframe(frame)`, `setPlayhead(frame)`, `setPlaying(boolean)`.
- A `Pose` is `Record<string, {rotation: [number, number, number], position: [number, number, number]}>`.

- [ ] **Step 1: Write a failing test that interpolates zero rotation to a 180° Y rotation at `t=0.5` and asserts the resulting quaternion has unit length; write a timeline test that clicking Play advances playhead from 0.**
- [ ] **Step 2: Run the focused tests; expect missing-module failure.**
- [ ] **Step 3: Implement Three.js `Quaternion.slerpQuaternions` conversion helpers, linear position interpolation, and a 24 fps requestAnimationFrame loop bounded by frame 24. Timeline renders a 0–24 ruler, frame-0/frame-24 keyframe diamonds, keyboard-focusable transport buttons, and draggable playhead.**
- [ ] **Step 4: Run full frontend tests; expect passing tests.**
- [ ] **Step 5: Commit with `feat: add keyframe timeline`.**

### Task 8: Render the perspective-aware 3D proxy stage

**Files:**
- Create: `frontend/src/components/scene/ProxyScene.tsx`, `frontend/src/components/scene/BoneProxy.tsx`, `frontend/src/components/scene/PerspectiveGrid.tsx`
- Modify: `frontend/src/components/studio/Artboard.tsx`, `frontend/src/components/studio/RigPanel.tsx`

**Interfaces:**
- `ProxyScene` consumes `{rig, pose, activeAssetUrl, showGrid, selectedBoneId, onSelectBone}`.
- `BoneProxy` derives proxy card transform from the bone endpoints and animated pose.

- [ ] **Step 1: Add a visual regression smoke test that mounts a two-bone rig and asserts a canvas exists plus both bone proxy labels are selectable.**
- [ ] **Step 2: Run it; expect missing-component failure.**
- [ ] **Step 3: Implement an R3F Canvas with a 35° `PerspectiveCamera`, ambient plus directional light, texture-loaded transparent cards cropped by each selection rectangle, and one-point grid lines. Apply each interpolated transform to its group; show the selected proxy with a coral outline.**
- [ ] **Step 4: Run tests and `npm run build`; expect success.**
- [ ] **Step 5: Commit with `feat: render 3d proxy animation preview`.**

### Task 9: Assemble the studio workbench and responsive visual system

**Files:**
- Create: `frontend/src/components/studio/StudioShell.tsx`, `frontend/src/components/studio/TopBar.tsx`, `frontend/src/components/studio/Inspector.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/styles.css`

**Interfaces:**
- `StudioShell` composes top bar, left contextual rail, central stage, inspector, and persistent timeline.
- Produces a desktop layout with CSS variables `--timeline-height`, `--rail-width`, and `--inspector-width`.

- [ ] **Step 1: Write a layout test that the timeline is rendered after rig creation and the inspector collapse control changes `aria-expanded`.**
- [ ] **Step 2: Run it; expect missing-shell failure.**
- [ ] **Step 3: Implement the cinematic ink/warm-paper/coral system, `Fraunces` and `DM Sans` web fonts, collapsible rails, CSS grid studio proportions, resizable 200–420 px timeline, and `prefers-reduced-motion` safe transitions. At `max-width: 1100px`, collapse inspector; at `max-width: 900px`, convert the rail to a drawer.**
- [ ] **Step 4: Run all frontend tests and `npm run build`; expect success.**
- [ ] **Step 5: Commit with `feat: compose puppet studio workbench`.**

### Task 10: Validate the full local workflow and document operation

**Files:**
- Create: `README.md`, `frontend/e2e/puppet-flow.spec.ts`
- Modify: `backend/tests/test_projects.py`

**Interfaces:**
- Provides documented commands to start API, client, run tests, and open the local studio.

- [ ] **Step 1: Write a Playwright test that creates a project, uploads a fixture PNG, applies cleanup, places shoulder/elbow/wrist joints, saves frame-0 and frame-24 poses, starts playback, reloads, and asserts the project still has three joints and two keyframes.**
- [ ] **Step 2: Run the browser test; expect initial failure until the complete user flow is wired.**
- [ ] **Step 3: Resolve integration mismatches only at public boundaries: API payload names, asset URL construction, and persisted rig/timeline serialization. Do not add unrelated features.**
- [ ] **Step 4: Run `python -m pytest -v` in `backend`, `npm run test` and `npm run build` in `frontend`, then the Playwright flow; expect all pass.**
- [ ] **Step 5: Commit with `test: verify puppet end to end`.**

## Self-review

- Coverage: Tasks 1–3 provide the Flask, storage, upload, and cleanup pipeline; 4–6 provide rig data and 2D editing; 7–8 provide animated proxy rendering; 9 supplies the approved workbench UI; 10 verifies the complete loop.
- No placeholders: every task names exact files, public interfaces, test intent, implementation behavior, and verification commands.
- Contract consistency: the API persists `Rig` and `Keyframe` JSON used by the TypeScript `ProjectRecord`; `ProxyScene` only consumes the `Rig` and interpolated `Pose` introduced in Tasks 4 and 7.

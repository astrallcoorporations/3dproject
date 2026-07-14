# Puppet — Base Rig Studio

Puppet is a local-first studio for turning flat character art into a simple
2D/3D rig you can pose and preview at 24 fps. A Flask + SQLite API owns
image cleanup and project persistence; a Vite + React client owns the
interactive rigging canvas, inspector, and animation timeline.

There is no authentication. Every project belongs to a single built-in
local owner (`studio-local`), and uploaded artwork is stored on disk under
`backend/instance/uploads` with relative URLs recorded in the database.

## Prerequisites

- Python 3.11+ (a virtualenv is recommended)
- Node.js 20+ and npm

## 1. Start the API

```sh
cd backend
python -m venv .venv               # first time only
.venv\Scripts\activate              # Windows (use `source .venv/bin/activate` on macOS/Linux)
pip install -r requirements.txt     # first time only
python -m flask --app run run --port 5000
```

Health check: `curl http://localhost:5000/api/health` should return
`{"status":"ok"}`. The API creates `backend/instance/puppet.db` and
`backend/instance/uploads/` on first run.

## 2. Start the client

In a second terminal:

```sh
cd frontend
npm install                         # first time only
npm run dev -- --port 5173
```

## 3. Open the local studio

With both processes running, open **http://localhost:5173**. Import a PNG,
JPEG, or WebP under 12 MB (the artboard's "Give your character a body"
tile, or the Import panel once art exists), optionally apply line cleanup,
place joints to build a rig, then open the animation desk to pose and save
keyframes at frame 0 and frame 24. "Save local" persists the rig and
timeline to the API; reloading the page restores the last saved project
(its active asset, rig, and timeline) automatically.

## Running the tests

### Backend (pytest)

```sh
cd backend
python -m pytest -v
```

### Frontend unit tests (Vitest)

```sh
cd frontend
npm run test -- --run
```

### Frontend production build

```sh
cd frontend
npm run build
```

### End-to-end flow test (Playwright)

The Playwright test drives the full workflow in a real Chromium browser:
import artwork, apply cleanup, place shoulder/elbow/wrist joints, save
poses at frame 0 and frame 24, start playback, save, reload the page, and
verify the rig (three joints, two bones) and timeline (two keyframes)
survive the reload.

```sh
cd frontend
npx playwright install chromium     # first time only
npm run test:e2e
```

`npm run test:e2e` (an alias for `npx playwright test`) starts its own
Flask API and Vite dev server automatically — see `frontend/playwright.config.ts`
— so no other process needs to be running first. If you already have the
API and client running from steps 1–2 above, set `PW_SKIP_WEBSERVER=1` to
reuse them instead of starting new ones:

```sh
PW_SKIP_WEBSERVER=1 npm run test:e2e
```

A fixture image for the upload step lives at
`frontend/e2e/fixtures/puppet-fixture.png`.

## Project layout

- `backend/app/` — Flask app factory, SQLAlchemy models, image refinement
  pipeline (Pillow), and REST routes for projects/assets/refine.
- `backend/tests/` — pytest suite covering health, project persistence,
  asset upload/refinement.
- `frontend/src/` — React 19 + Vite + Zustand studio: the Zustand store
  (`store/project-store.ts`), API client (`lib/api.ts`), 2D rigging canvas
  and inspector/timeline panels (`components/studio/`), and the
  react-three-fiber 3D proxy preview (`components/scene/`).
- `frontend/e2e/` — Playwright end-to-end flow test and its fixture image.

## Constraints this build honors

- Single local owner id `studio-local`; no auth UI.
- Uploads are limited to PNG/JPEG/WebP, 12 MB max, stored under
  `backend/instance/uploads` with relative URLs in the database.
- Refinement always preserves the original asset and writes a new PNG.
- Timeline runs at 24 fps; keyframes at frame 0 and frame 24 are created
  automatically as soon as the rig gains its first bone.

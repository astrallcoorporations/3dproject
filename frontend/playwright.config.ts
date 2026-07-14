import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = 5000;
const FRONTEND_PORT = 5173;

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Resolve the project's virtualenv Python (as an absolute path, since a
// relative path with a leading ".." is not resolvable by Windows cmd.exe
// when spawning the webServer command) so `flask run` picks up the
// dependencies installed there instead of whatever `python` resolves to
// on PATH.
const backendPython = path.join(
  repoRoot,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Starts both the Flask API and the Vite dev server automatically so
  // `npx playwright test` is a single self-contained command, matching the
  // README's documented workflow. Set PW_SKIP_WEBSERVER=1 to reuse servers
  // you already started by hand.
  webServer: process.env.PW_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: `"${backendPython}" -m flask --app run run --port ${BACKEND_PORT}`,
          cwd: "../backend",
          url: `http://localhost:${BACKEND_PORT}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
          url: `http://localhost:${FRONTEND_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

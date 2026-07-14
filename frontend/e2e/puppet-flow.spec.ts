import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "fixtures", "puppet-fixture.png");

test("full puppet workflow: import, refine, rig, animate, save, and reload", async ({ page }) => {
  await page.goto("/");

  // --- Import artwork (auto-creates the project) ---
  await page.setInputFiles("#art-upload", fixturePath);
  const applyCleanup = page.getByRole("button", { name: "Apply cleanup" });
  await expect(applyCleanup).toBeEnabled();

  // --- Apply line cleanup, which hands off to the rigging desk ---
  await applyCleanup.click();
  await expect(page.getByRole("heading", { name: "Joint markers" })).toBeVisible();

  // --- Place shoulder, elbow, and wrist joints, forming two connected bones ---
  const leftArmGroup = page.locator(".joint-group", { hasText: "LEFT ARM" });
  const stage = page.getByRole("application");

  await leftArmGroup.getByRole("button", { name: "Shoulder" }).click();
  await stage.click({ position: { x: 60, y: 40 } });

  await leftArmGroup.getByRole("button", { name: "Elbow" }).click();
  await stage.click({ position: { x: 100, y: 90 } });

  await leftArmGroup.getByRole("button", { name: "Wrist" }).click();
  await stage.click({ position: { x: 140, y: 150 } });

  await expect(page.locator(".rig-summary")).toContainText("3 joints");
  await expect(page.locator(".rig-summary")).toContainText("2 bones");

  // --- Open the animation desk ---
  await page.getByRole("button", { name: "Open animation desk →" }).click();
  await expect(page.getByRole("button", { name: "Save keyframe" })).toBeVisible();

  // --- Pose and save frame 0 ---
  const turnSlider = page.locator(".transform-controls label", { hasText: "Turn / Y" }).locator("input[type=range]");
  await turnSlider.focus();
  await turnSlider.press("End");
  await page.getByRole("button", { name: "Save keyframe" }).click();

  // --- Move to frame 24, pose it differently, and save ---
  await page.locator(".pose-card", { hasText: "Frame 24" }).getByRole("button", { name: "Edit" }).click();
  await turnSlider.focus();
  await turnSlider.press("Home");
  await page.getByRole("button", { name: "Save keyframe" }).click();

  await expect(page.getByRole("button", { name: "Go to keyframe 0" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to keyframe 24" })).toBeVisible();

  // --- Start (and stop) playback ---
  await page.getByRole("button", { name: "Play animation" }).click();
  await expect(page.getByRole("button", { name: "Pause playback" })).toBeVisible();
  await page.getByRole("button", { name: "Pause playback" }).click();

  // --- Persist the rig and timeline to the backend ---
  await page.getByRole("button", { name: "Save local" }).click();
  await expect(page.locator(".stage-bar")).toContainText("Rig and timeline saved to Local Studio.");

  // --- Reload the page and confirm the project's rig and timeline survive ---
  await page.reload();
  await expect(page.locator(".refine-stage img")).toBeVisible();

  const rigModeButton = page.getByRole("button", { name: "rig", exact: true });
  await expect(rigModeButton).toBeEnabled();
  await rigModeButton.click();
  await expect(page.locator(".rig-summary")).toContainText("3 joints");
  await expect(page.locator(".rig-summary")).toContainText("2 bones");

  const animateModeButton = page.getByRole("button", { name: "animate", exact: true });
  await expect(animateModeButton).toBeEnabled();
  await animateModeButton.click();
  await expect(page.getByRole("button", { name: "Go to keyframe 0" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to keyframe 24" })).toBeVisible();
});

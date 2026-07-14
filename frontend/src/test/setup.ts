import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { ACTIVE_PROJECT_STORAGE_KEY, safeStorage } from "../lib/local-storage";

afterEach(() => {
  cleanup();
  safeStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
});

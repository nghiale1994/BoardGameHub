import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/e2e", open: "never" }],
    ["json", { outputFile: "test-results/e2e/results.json" }],
    ...(process.env.CI ? [["github"]] : [])
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    env: {
      // Default: deterministic E2E (no PeerJS). Override per-run via env.
      VITE_E2E_DISABLE_PEERJS: process.env.VITE_E2E_DISABLE_PEERJS ?? "1",
      VITE_PEERJS_HOST: process.env.VITE_PEERJS_HOST,
      VITE_PEERJS_PORT: process.env.VITE_PEERJS_PORT,
      VITE_PEERJS_PATH: process.env.VITE_PEERJS_PATH,
      VITE_PEERJS_SECURE: process.env.VITE_PEERJS_SECURE,
      VITE_PEERJS_KEY: process.env.VITE_PEERJS_KEY
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "msedge",
      use: { ...devices["Desktop Edge"], channel: "msedge" }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});

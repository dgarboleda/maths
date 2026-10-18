import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./performance",
  outputDir: "./performance-reports/results",
  workers: 1,
  retries: 0,
  timeout: 240_000,
  projects: [{ name: "rendimiento" }],
  reporter: [["list"], ["html", { outputFolder: "performance-reports/playwright", open: "never" }]],
  webServer: Array.isArray(base.webServer) ? base.webServer.map((server) => ({
    ...server,
    command: server.command.startsWith("npx next dev") ? `node node_modules/next/dist/bin/next start --port ${process.env.E2E_PORT ?? 3210}` : server.command,
    reuseExistingServer: server.command.startsWith("npx next dev") || server.command.includes("/next start") ? !process.env.CI : server.reuseExistingServer,
  })) : base.webServer,
});

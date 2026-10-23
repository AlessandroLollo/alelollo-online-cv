import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL:
      process.env.CV_BASE_URL || "http://127.0.0.1:4321/me/",
    colorScheme: "light",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  webServer: process.env.CV_BASE_URL
    ? undefined
    : {
        command: "npm run preview -- --port 4321",
        url: "http://127.0.0.1:4321/me/",
        reuseExistingServer: !process.env.CI,
        env: { ASTRO_TELEMETRY_DISABLED: "1" },
      },
});

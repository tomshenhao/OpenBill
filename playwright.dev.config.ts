import { defineConfig } from "@playwright/test";

// Use a second loopback host on CI; set the actual server LAN IP for device-access QA.
const host = process.env.OPENBILL_TEST_LAN_HOST ?? "127.0.0.2";
export default defineConfig({
  testDir: "./tests/dev",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3111", trace: "off", screenshot: "off", video: "off" },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 3111",
    url: "http://127.0.0.1:3111",
    env: { OPENBILL_DEV_ORIGINS: host, NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

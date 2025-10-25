import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL && process.env.BASE_URL.length > 0
  ? process.env.BASE_URL
  : "https://nextgendashboard.trecasa.com";

export default defineConfig({
  testDir: "./smoke",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

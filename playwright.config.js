import { defineConfig } from "@playwright/test";
const browserName = process.env.PW_BROWSER || 'chromium';
export default defineConfig({
  testDir: "./tests",
  timeout: 180000,
  use: {
    browserName,
    baseURL: "http://127.0.0.1:5187",
    headless: true,
    launchOptions: {
      ...(browserName === 'chromium' ? { args: ["--enable-unsafe-swiftshader"] } : {}),
      ...(process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {}),
    },
  },
  workers: 1,
  reporter: "list",
});

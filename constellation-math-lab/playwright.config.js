import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/artifacts',
  timeout: 20_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4177',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: true,
  },
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:5173/recommendation-sample-with-llm/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // CI環境ではwait-onで待機するのでwebServerは不要
  // ローカルでは手動でfrontendを起動するか、webServerを使用
  ...(process.env.CI
    ? {}
    : {
        webServer: {
          command: 'cd ../frontend && npm run dev',
          url: 'http://localhost:5173/recommendation-sample-with-llm/',
          reuseExistingServer: true,
          timeout: 120000,
        },
      }),
});

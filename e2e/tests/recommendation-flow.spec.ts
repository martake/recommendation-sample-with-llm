import { test, expect, Page } from '@playwright/test';

// Wait for app to be fully loaded
async function waitForAppReady(page: Page) {
  await page.waitForSelector('h1', { timeout: 30000 });
}

test.describe('Recommendation Benchmark Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('displays initial UI elements', async ({ page }) => {
    // Title is visible
    await expect(page.locator('h1')).toBeVisible();

    // Control section is present
    await expect(page.locator('.controls')).toBeVisible();

    // Buttons are present (using text content)
    const buttons = page.locator('.control-buttons button');
    await expect(buttons).toHaveCount(3);
  });

  test('complete recommendation flow', async ({ page }) => {
    // Step 1: Generate training data
    const generateBtn = page.locator('.control-buttons button').first();
    await generateBtn.click();

    // Wait for data summary to appear
    await expect(page.locator('.data-summary')).toBeVisible({ timeout: 15000 });

    // Step 2: Train the model
    const trainBtn = page.locator('.control-buttons button').nth(1);
    await expect(trainBtn).toBeEnabled({ timeout: 5000 });
    await trainBtn.click();

    // Wait for training to complete
    const inferBtn = page.locator('.control-buttons button').nth(2);
    await expect(inferBtn).toBeEnabled({ timeout: 60000 });

    // Step 3: Run inference
    await inferBtn.click();

    // Wait for results to appear
    await expect(page.locator('.results-table')).toBeVisible({ timeout: 60000 });

    // Verify results table has data (3 methods shown)
    const resultsTable = page.locator('.results-table');
    // Check for percentage sign which appears in all languages
    await expect(resultsTable).toContainText('%');

    // Charts should be visible
    await expect(page.locator('.charts')).toBeVisible();

    // LLM Assistant section should be visible
    await expect(page.locator('.llm-assistant')).toBeVisible();
  });

  test('parameter inputs work correctly', async ({ page }) => {
    // Find and modify train users input (first input in control-grid)
    const trainUsersInput = page.locator('.control-grid input').first();
    await trainUsersInput.fill('50');

    // Generate train with new parameter
    const generateBtn = page.locator('.control-buttons button').first();
    await generateBtn.click();

    // Verify data summary appears
    await expect(page.locator('.data-summary')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Language Switching', () => {
  test('switches between English and Japanese', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Find language selector
    const languageSelect = page.locator('.language-switcher select');
    await expect(languageSelect).toBeVisible();

    // Switch to Japanese
    await languageSelect.selectOption('ja');

    // Verify Japanese text appears (wait for re-render)
    await expect(page.locator('h1')).toContainText('合成レコメンダーベンチマーク', { timeout: 5000 });

    // Switch back to English
    await languageSelect.selectOption('en');

    // Verify English text appears
    await expect(page.locator('h1')).toContainText('Synthetic Recommender Benchmark', { timeout: 5000 });
  });
});

test.describe('Full flow with results', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Run through the complete flow
    const generateBtn = page.locator('.control-buttons button').first();
    await generateBtn.click();
    await expect(page.locator('.data-summary')).toBeVisible({ timeout: 15000 });

    const trainBtn = page.locator('.control-buttons button').nth(1);
    await trainBtn.click();

    const inferBtn = page.locator('.control-buttons button').nth(2);
    await expect(inferBtn).toBeEnabled({ timeout: 60000 });
    await inferBtn.click();

    await expect(page.locator('.results-table')).toBeVisible({ timeout: 60000 });
  });

  test('displays threshold chart after inference', async ({ page }) => {
    await expect(page.locator('.threshold-chart')).toBeVisible();
  });

  test('LLM assistant UI is present', async ({ page }) => {
    await expect(page.locator('.llm-assistant')).toBeVisible();

    // Verify controls are present
    await expect(page.locator('.llm-prompt-mode')).toBeVisible();
  });

  test('prompt mode selector works', async ({ page }) => {
    // Find prompt mode selector
    const promptSelect = page.locator('.llm-prompt-mode select');
    await expect(promptSelect).toBeVisible();

    // Switch to custom mode
    await promptSelect.selectOption('custom');

    // Custom prompt textarea should appear
    await expect(page.locator('.llm-custom-prompt textarea')).toBeVisible();
  });

  test('RAG context toggle works', async ({ page }) => {
    // Click show RAG context button
    const ragButton = page.locator('.llm-debug button').first();
    await ragButton.click();

    // RAG context section should appear
    await expect(page.locator('.rag-context')).toBeVisible();

    // Click again to hide
    await ragButton.click();

    // RAG context should be hidden
    await expect(page.locator('.rag-context')).not.toBeVisible();
  });

  test('displays sample logs with user color information', async ({ page }) => {
    await expect(page.locator('.sample-logs')).toBeVisible();

    // Should display user RGB values
    await expect(page.locator('.user-rgb').first()).toBeVisible();

    // Should display color swatches
    await expect(page.locator('.user-color-swatch').first()).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForAppReady(page);

    // Basic elements should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.controls')).toBeVisible();
  });
});

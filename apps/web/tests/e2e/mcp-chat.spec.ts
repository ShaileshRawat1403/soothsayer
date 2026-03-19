import { test, expect } from '@playwright/test';

test.describe('MCP chat flow', () => {
  test('hands off execution-shaped chat requests into the live run console', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('soothsayer-onboarding-complete', 'true');
      localStorage.setItem(
        'soothsayer-ai-providers',
        JSON.stringify({
          state: {
            activeProvider: 'ollama',
            activeModel: 'llama3:latest',
          },
          version: 0,
        }),
      );
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/chat');
    await expect(page.getByPlaceholder('Ask anything... (Shift+Enter for new line)')).toBeVisible();

    const responsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/api/chat/conversations/') &&
        response.url().includes('/messages')
      );
    });

    const input = page.getByPlaceholder('Ask anything... (Shift+Enter for new line)');
    await input.fill('Inspect the repo and start a live run to debug the current auth flow.');
    await input.press('Enter');

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    const payload = body?.data || body;
    const assistantMessage = payload?.assistantMessage;
    const handoff = assistantMessage?.metadata?.handoff;

    expect(handoff?.type).toBe('dax_run');
    expect(typeof handoff?.runId).toBe('string');
    expect(handoff?.targetPath).toBe(`/runs/${handoff.runId}`);

    await expect(page.getByText('Live execution handoff')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open live run' })).toBeVisible();
    await expect(page.getByText(handoff.runId).first()).toBeVisible();

    await page.getByRole('button', { name: 'Open live run' }).click();

    await expect(page).toHaveURL(new RegExp(`/runs/${handoff.runId}$`));
    await expect(page.getByText('Run ID:').first()).toBeVisible();
    await expect(page.getByText(handoff.runId).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Snapshot' })).toBeVisible();
  });

  test('logs in and confirms MCP preflight metadata in chat response', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('soothsayer-onboarding-complete', 'true');
      localStorage.setItem(
        'soothsayer-ai-providers',
        JSON.stringify({
          state: {
            activeProvider: 'ollama',
            activeModel: 'llama3:latest',
          },
          version: 0,
        }),
      );
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/chat');
    await expect(page.getByPlaceholder('Ask anything... (Shift+Enter for new line)')).toBeVisible();

    const responsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/api/chat/conversations/') &&
        response.url().includes('/messages')
      );
    });

    const input = page.getByPlaceholder('Ask anything... (Shift+Enter for new line)');
    await input.fill('In 2 bullets, summarize this project.');
    await input.press('Enter');

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    const payload = body?.data || body;
    const assistantMessage = payload?.assistantMessage;
    expect(assistantMessage).toBeTruthy();
    expect(assistantMessage?.metadata?.mcp).toBeTruthy();

    await expect(page.getByText('Model:')).toBeVisible();
  });

  test('keeps user message visible after Enter submit and page reload', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('soothsayer-onboarding-complete', 'true');
      localStorage.setItem(
        'soothsayer-ai-providers',
        JSON.stringify({
          state: {
            activeProvider: 'ollama',
            activeModel: 'llama3:latest',
          },
          version: 0,
        }),
      );
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/chat');
    const input = page.getByPlaceholder('Ask anything... (Shift+Enter for new line)');
    await expect(input).toBeVisible();

    const prompt = `stability-check-${Date.now()}`;
    const responsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/api/chat/conversations/') &&
        response.url().includes('/messages')
      );
    });

    await input.fill(prompt);
    await input.press('Enter');
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    await expect(page.getByText(prompt).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(prompt).first()).toBeVisible();
  });
});

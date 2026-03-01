import { test, expect } from '@playwright/test';

test.describe('MCP chat flow', () => {
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
});


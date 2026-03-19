import { test, expect } from '@playwright/test';

const WORKSPACE_REPO_PATH = '/Users/ananyalayek/soothsayer';

async function bridgeApiToIpv6(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.includes('/api/dax/runs/') && url.pathname.endsWith('/events')) {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache, no-transform',
          connection: 'close',
        },
        body: '',
      });
      return;
    }

    const targetUrl = `http://[::1]:3000${url.pathname}${url.search}`;
    const headers = { ...request.headers() };
    delete headers.host;

    const response = await page.request.fetch(targetUrl, {
      method: request.method(),
      headers,
      data: request.postDataBuffer() ?? undefined,
      failOnStatusCode: false,
    });

    await route.fulfill({ response });
  });
}

test.describe('MCP chat flow', () => {
  test('hands off execution-shaped chat requests into the live run console', async ({ page }) => {
    await page.addInitScript((repoPath) => {
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
      localStorage.setItem(
        'soothsayer-workspace',
        JSON.stringify({
          state: {
            currentWorkspace: {
              id: 'cmm5xj5n5000555ec6s36j30i',
              name: 'Default Workspace',
              slug: 'default-workspace',
              settings: {
                defaultRepoPath: repoPath,
              },
            },
            currentProject: null,
          },
          version: 0,
        }),
      );
    }, WORKSPACE_REPO_PATH);
    await bridgeApiToIpv6(page);

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
    expect(handoff?.targeting?.mode).toBe('explicit_repo_path');
    expect(handoff?.targeting?.repoPath).toBe(WORKSPACE_REPO_PATH);
    expect(handoff?.targetPath).toBe(
      `/runs/${handoff.runId}?targetMode=explicit_repo_path&repoPath=${encodeURIComponent(WORKSPACE_REPO_PATH)}`,
    );

    await expect(page.getByText('Live execution handoff')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open live run' })).toBeVisible();
    await expect(page.getByText(handoff.runId).first()).toBeVisible();
    await expect(page.getByText(WORKSPACE_REPO_PATH)).toBeVisible();

    await page.getByRole('button', { name: 'Open live run' }).click();

    await expect(page).toHaveURL(new RegExp(`/runs/${handoff.runId}\\?`));
    await expect(page.getByText('Run ID:').first()).toBeVisible();
    await expect(page.getByText(handoff.runId).first()).toBeVisible();
    await expect(page.getByText(`Target: ${WORKSPACE_REPO_PATH}`)).toBeVisible();
    await expect(page.getByText('Explicit repo target')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Snapshot' })).toBeVisible();

    await page.unrouteAll({ behavior: 'ignoreErrors' });
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

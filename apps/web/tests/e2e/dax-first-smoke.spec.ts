import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

const WORKSPACE_ID = 'cmm5xj5n5000555ec6s36j30i';
const WORKSPACE_REPO_PATH = '/Users/ananyalayek/soothsayer';
const STUB_BASE_URL = 'http://127.0.0.1:4096';

async function resetSmokeState(request: APIRequestContext) {
  await request.post(`${STUB_BASE_URL}/__smoke/reset`);
}

async function getSmokeState(request: APIRequestContext) {
  const response = await request.get(`${STUB_BASE_URL}/__smoke/state`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function seedClientState(
  page: Parameters<typeof test>[0]['page'],
  options?: {
    providerState?: Record<string, unknown>;
  },
) {
  await page.addInitScript(
    ({ workspaceId, repoPath, providerState }) => {
      localStorage.setItem('soothsayer-onboarding-complete', 'true');
      localStorage.setItem(
        'soothsayer-workspace',
        JSON.stringify({
          state: {
            currentWorkspace: {
              id: workspaceId,
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

      if (providerState) {
        localStorage.setItem(
          'soothsayer-ai-providers',
          JSON.stringify(providerState),
        );
      }
    },
    {
      workspaceId: WORKSPACE_ID,
      repoPath: WORKSPACE_REPO_PATH,
      providerState: options?.providerState,
    },
  );
}

async function login(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@soothsayer.local');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openChat(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/chat');
  await expect(
    page.getByPlaceholder('Ask Soothsayer. DAX stays in chat until live execution is needed...'),
  ).toBeVisible();
}

test.describe('DAX-first release smoke', () => {
  test.beforeEach(async ({ page, request }) => {
    await resetSmokeState(request);
    await seedClientState(page);
  });

  test('default plain chat uses DAX mode', async ({ page, request }) => {
    await login(page);
    await openChat(page);

    const responsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/api/chat/conversations/') &&
        response.url().includes('/messages')
      );
    });

    const input = page.getByPlaceholder(
      'Ask Soothsayer. DAX stays in chat until live execution is needed...',
    );
    await input.fill('Summarize this application in one sentence.');
    await input.press('Enter');

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    const payload = body?.data || body;
    expect(payload?.assistantMessage?.metadata?.provider).toBe('dax');
    expect(payload?.assistantMessage?.metadata?.handoff).toBeFalsy();

    await expect(page.getByText('DAX stub response').first()).toBeVisible();

    const smokeState = await getSmokeState(request);
    expect(smokeState.daxRunCreateCount).toBe(1);
    expect(smokeState.openAiChatCount).toBe(0);
  });

  test('governed handoff creates exactly one DAX run', async ({ page, request }) => {
    await login(page);
    await openChat(page);

    const responsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/api/chat/conversations/') &&
        response.url().includes('/messages')
      );
    });

    const input = page.getByPlaceholder(
      'Ask Soothsayer. DAX stays in chat until live execution is needed...',
    );
    await input.fill('Inspect the repo and start a live run to debug the current auth flow.');
    await input.press('Enter');

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    const payload = body?.data || body;
    const handoff = payload?.assistantMessage?.metadata?.handoff;
    expect(payload?.assistantMessage?.metadata?.provider).toBe('dax');
    expect(handoff?.type).toBe('dax_run');
    expect(typeof handoff?.runId).toBe('string');
    expect(handoff?.targeting?.repoPath).toBe(WORKSPACE_REPO_PATH);

    await expect(page.getByText('Live Run Active')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Live Console' })).toBeVisible();

    const smokeState = await getSmokeState(request);
    expect(smokeState.daxRunCreateCount).toBe(1);
    expect(smokeState.openAiChatCount).toBe(0);
    expect(smokeState.runs).toHaveLength(1);
  });

  test('explicit direct fallback uses the selected backend', async ({ page, request }) => {
    await seedClientState(page, {
      providerState: {
        state: {
          activeProvider: 'openai',
          activeModel: 'gpt-4o-mini',
        },
        version: 2,
      },
    });

    await login(page);
    await openChat(page);

    const responsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/api/chat/conversations/') &&
        response.url().includes('/messages')
      );
    });

    const input = page.getByPlaceholder(
      'Ask Soothsayer. DAX stays in chat until live execution is needed...',
    );
    await input.fill('Summarize this app in one sentence.');
    await input.press('Enter');

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const body = await response.json();
    const payload = body?.data || body;
    expect(payload?.assistantMessage?.metadata?.provider).toBe('openai');
    expect(payload?.assistantMessage?.metadata?.handoff).toBeFalsy();

    await expect(page.getByText('OpenAI fallback stub response.').first()).toBeVisible();

    const smokeState = await getSmokeState(request);
    expect(smokeState.daxRunCreateCount).toBe(0);
    expect(smokeState.openAiChatCount).toBe(1);
  });

  test('persisted provider migration falls back to DAX cleanly', async ({ page }) => {
    await seedClientState(page, {
      providerState: {
        state: {
          activeProvider: 'anthropic',
          activeModel: 'claude-3-sonnet-20240229',
        },
        version: 0,
      },
    });

    await login(page);
    await openChat(page);

    await expect(page.getByText('DAX primary route ready')).toBeVisible();
    await expect(page.getByText('DAX-governed assistant')).toBeVisible();

    const persistedState = await page.evaluate(() => {
      const raw = localStorage.getItem('soothsayer-ai-providers');
      return raw ? JSON.parse(raw) : null;
    });

    expect(persistedState?.state?.activeProvider).toBe('dax');
    expect(persistedState?.state?.activeModel).toBe('gemini-2.5-pro');
  });
});

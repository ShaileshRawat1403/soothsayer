import { expect, test, type Page } from '@playwright/test';

const WORKSPACE_REPO_PATH = '/Users/ananyalayek/soothsayer';

async function seedClientState(page: Page) {
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
}

async function bridgeApiToIpv6(page: Page) {
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

test.describe('Direct run targeting', () => {
  test('shows explicit target context and carries it into the run header', async ({ page }) => {
    await seedClientState(page);
    await bridgeApiToIpv6(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/runs/new');
    await expect(page.getByText('Execution Target')).toBeVisible();
    await expect(page.getByText(WORKSPACE_REPO_PATH)).toBeVisible();
    await expect(page.getByText('This run will launch against the explicit repo target above.')).toBeVisible();

    const responsePromise = page.waitForResponse((response) => {
      return response.request().method() === 'POST' && response.url().includes('/api/dax/runs');
    });

    await page.getByPlaceholder(
      'Example: inspect the repo, propose a safe patch for the failing auth flow, and wait for approval before editing files.',
    ).fill(
      'Inspect this repository and report the current working directory name without editing any files.',
    );
    await page.getByRole('button', { name: 'Start Run' }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    const requestBody = response.request().postDataJSON();
    expect(requestBody.intent.repoPath).toBe(WORKSPACE_REPO_PATH);

    const body = await response.json();
    const payload = body?.data || body;
    const runId = payload?.runId as string;
    expect(typeof runId).toBe('string');

    await expect(page).toHaveURL(new RegExp(`/runs/${runId}\\?`));
    await expect(page.getByText(`Target: ${WORKSPACE_REPO_PATH}`)).toBeVisible();
    await expect(page.getByText('Explicit repo target')).toBeVisible();
  });
});

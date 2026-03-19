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

async function readAuthToken(page: Page) {
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('soothsayer-auth');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return parsed?.state?.token ?? null;
    } catch {
      return null;
    }
  });

  expect(token).toBeTruthy();
  return token as string;
}

async function createOverviewRun(page: Page, token: string, input: string) {
  const response = await page.request.post('http://[::1]:3000/api/dax/runs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      intent: {
        input,
        kind: 'general',
        repoPath: WORKSPACE_REPO_PATH,
      },
      metadata: {
        source: 'soothsayer',
        targeting: {
          mode: 'explicit_repo_path',
          repoPath: WORKSPACE_REPO_PATH,
        },
      },
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  const payload = body?.data || body;
  expect(typeof payload?.runId).toBe('string');
  return payload.runId as string;
}

test.describe('DAX overview page', () => {
  test('shows the DAX control panel route, nav, and health state', async ({ page }) => {
    await seedClientState(page);
    await bridgeApiToIpv6(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const token = await readAuthToken(page);
    const activeRunId = await createOverviewRun(
      page,
      token,
      '',
    );

    await expect(page.getByRole('link', { name: 'DAX Control' })).toBeVisible();
    await page.getByRole('link', { name: 'DAX Control' }).click();

    await expect(page).toHaveURL(/\/dax$/);
    await expect(page.getByRole('heading', { name: 'Governed execution overview' })).toBeVisible();
    await expect(page.getByText('DAX health')).toBeVisible();
    await expect(page.getByText('Healthy')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active runs' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending approvals' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent runs' })).toBeVisible();
    await expect(page.getByText(activeRunId).first()).toBeVisible();
    await expect(page.getByText(WORKSPACE_REPO_PATH).first()).toBeVisible();

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});

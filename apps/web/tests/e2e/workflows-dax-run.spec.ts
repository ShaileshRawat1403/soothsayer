import { expect, test } from '@playwright/test';

async function seedClientState(page: Parameters<typeof test>[0]['page']) {
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
}

async function bridgeApiToIpv6(page: Parameters<typeof test>[0]['page']) {
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

test.describe('Workflow dax_run handoff', () => {
  test('configures a dax_run step and opens the linked live run', async ({ page }) => {
    await seedClientState(page);
    await bridgeApiToIpv6(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/workflows');
    await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();

    await page.getByRole('button', { name: 'New' }).click();

    const workflowName = `DAX UI workflow ${Date.now()}`;
    const editorNameInput = page.locator('input').nth(1);
    await editorNameInput.fill(workflowName);

    await page.getByPlaceholder('Step name').fill('Governed repo task');

    const stepRow = page.getByPlaceholder('Step name').locator('xpath=ancestor::div[contains(@class,"grid-cols-12")]').first();
    await stepRow.locator('select').first().selectOption('dax_run');
    await page.getByPlaceholder('Instruction').fill(
      'Inspect this repository and report the current working directory name without editing any files.',
    );
    await page.getByPlaceholder('Persona ID').fill('staff-swe');
    await stepRow.locator('select').nth(2).selectOption('relaxed');
    await stepRow.locator('select').nth(3).selectOption('medium');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Workflow saved')).toBeVisible();

    const runResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === 'POST' && /\/api\/workflows\/.+\/run$/.test(response.url());
    });

    await page.getByRole('button', { name: 'Run Now' }).click();

    const runResponse = await runResponsePromise;
    expect(runResponse.status()).toBe(201);

    const runBody = await runResponse.json();
    const payload = runBody?.data || runBody;
    const daxRunId =
      payload?.outputs?.latestDaxRunId ||
      payload?.outputs?.daxRuns?.[payload?.outputs?.daxRuns?.length - 1]?.runId;

    expect(typeof daxRunId).toBe('string');

    await expect(page.getByText('Latest workflow execution delegated to DAX')).toBeVisible();
    await expect(page.getByText(daxRunId).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open live run' })).toBeVisible();

    await page.getByRole('link', { name: 'Open live run' }).click();

    await expect(page).toHaveURL(new RegExp(`/runs/${daxRunId}$`));
    await expect(page.getByText('Run ID:').first()).toBeVisible();
    await expect(page.getByText(daxRunId).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Snapshot' })).toBeVisible();

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});

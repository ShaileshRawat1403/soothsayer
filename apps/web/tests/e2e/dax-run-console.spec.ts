import { expect, test, type Page } from '@playwright/test';

async function seedClientState(page: Page) {
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

async function login(page: Page) {
  await seedClientState(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@soothsayer.local');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
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

async function createStrictApprovalRun(page: Page, input: string) {
  const token = await readAuthToken(page);
  const response = await page.request.post('http://127.0.0.1:3001/api/dax/runs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      intent: {
        input,
        kind: 'general',
      },
      personaPreset: {
        personaId: 'staff-swe',
        approvalMode: 'strict',
        riskLevel: 'high',
        preferredCapabilityClasses: ['shell', 'code'],
      },
      metadata: {
        source: 'soothsayer',
      },
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  const payload = body?.data || body;
  expect(typeof payload?.runId).toBe('string');
  return payload.runId as string;
}

test.describe('DAX run console', () => {
  test('persists pending approval across refresh', async ({ page }) => {
    await login(page);
    const runId = await createStrictApprovalRun(
      page,
      'Use the shell to run pwd in this repository, then stop.',
    );

    await page.goto(`/runs/${runId}`);

    await expect(page.getByRole('heading', { name: 'Approval Required' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Run is paused for approval.')).toBeVisible();
    await expect(page.getByText(runId).first()).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(new RegExp(`/runs/${runId}$`));
    await expect(page.getByRole('heading', { name: 'Approval Required' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Run is paused for approval.')).toBeVisible();
    await expect(page.getByText(runId).first()).toBeVisible();
  });

  test('shows terminal failure after denying an approval', async ({ page }) => {
    await login(page);
    const runId = await createStrictApprovalRun(
      page,
      'Use the shell to run pwd in this repository, then stop.',
    );

    await page.goto(`/runs/${runId}`);

    await expect(page.getByRole('heading', { name: 'Approval Required' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Deny' }).click();

    await expect(page.getByRole('heading', { name: 'Approval Required' })).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('failed').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('failure').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Run Summary')).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(new RegExp(`/runs/${runId}$`));
    await expect(page.getByRole('heading', { name: 'Approval Required' })).not.toBeVisible();
    await expect(page.getByText('failed').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('failure').first()).toBeVisible({ timeout: 30_000 });
  });
});

import { expect, test } from '@playwright/test';

const WORKSPACE_ID = 'cmm5xj5n5000555ec6s36j30i';
const WORKSPACE_REPO_PATH = '/Users/ananyalayek/soothsayer';

async function seedClientState(
  page: Parameters<typeof test>[0]['page'],
) {
  await page.addInitScript(
    ({ workspaceId, repoPath }) => {
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
    },
    {
      workspaceId: WORKSPACE_ID,
      repoPath: WORKSPACE_REPO_PATH,
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

test.describe('Picobot page', () => {
  test.beforeEach(async ({ page }) => {
    await seedClientState(page);
  });

  test('shows modular operator sections with live telegram activity', async ({ page }) => {
    await login(page);
    await page.goto('/picobot');

    await expect(page.getByRole('heading', { name: 'Picobot' })).toBeVisible();
    await expect(page.getByText('Picobot Ingress Plane')).toBeVisible();
    await expect(page.getByRole('button', { name: /Overview/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Channels/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Telegram Logs/i }).first()).toBeVisible();
    await expect(page.getByText('Telegram logs live')).toBeVisible();

    await page.getByRole('button', { name: /Telegram Logs/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Telegram Log Console' })).toBeVisible();
    await expect(page.getByPlaceholder('Search Telegram logs, users, and command traces...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Telegram/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /Channels/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Channel Registry' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Session Inspector' })).toBeVisible();

    await page.getByRole('button', { name: /Governance/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Governed Activity' })).toBeVisible();
  });
});

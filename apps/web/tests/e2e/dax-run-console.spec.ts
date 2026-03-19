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

async function bridgeApiToIpv6(page: Page, handlers?: {
  runId?: string;
  handle?: (request: Parameters<Page['route']>[1]['request']) => Promise<{
    status?: number;
    contentType?: string;
    body?: string;
    headers?: Record<string, string>;
  } | null>;
}) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (handlers?.handle) {
      const mock = await handlers.handle(request);
      if (mock) {
        await route.fulfill({
          status: mock.status ?? 200,
          contentType: mock.contentType,
          body: mock.body,
          headers: mock.headers,
        });
        return;
      }
    }

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
  test('reconnects the stream from the last cursor and converges to terminal state', async ({ page }) => {
    const runId = 'ses_reconnect_mock';
    const startedAt = '2026-03-19T12:00:00.000Z';
    const stepTimestamp = '2026-03-19T12:00:01.000Z';
    const completedAt = '2026-03-19T12:00:02.000Z';
    let terminal = false;
    const seenEventCursors: string[] = [];

    await seedClientState(page);
    await bridgeApiToIpv6(page, {
      handle: async (request) => {
        const url = new URL(request.url());
        if (url.pathname === `/api/dax/runs/${runId}` && request.method() === 'GET') {
          return {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schemaVersion: 'v1',
              authority: 'dax',
              runId,
              status: terminal ? 'completed' : 'running',
              createdAt: startedAt,
              updatedAt: terminal ? completedAt : stepTimestamp,
              startedAt,
              completedAt: terminal ? completedAt : undefined,
              title: 'Reconnect test run',
              currentStep: terminal
                ? { stepId: 'step-1', status: 'completed', title: 'Reconnect check' }
                : { stepId: 'step-1', status: 'running', title: 'Reconnect check' },
              pendingApprovalCount: 0,
              artifactSummary: { total: 0 },
              lastEvent: terminal
                ? {
                    eventId: 'evt-2',
                    sequence: 2,
                    cursor: 'cursor-2',
                    timestamp: completedAt,
                  }
                : {
                    eventId: 'evt-1',
                    sequence: 1,
                    cursor: 'cursor-1',
                    timestamp: stepTimestamp,
                  },
            }),
          };
        }

        if (url.pathname === `/api/dax/runs/${runId}/approvals` && request.method() === 'GET') {
          return {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ runId, approvals: [] }),
          };
        }

        if (url.pathname === `/api/dax/runs/${runId}/summary` && request.method() === 'GET') {
          return {
            status: terminal ? 200 : 404,
            contentType: 'application/json',
            body: terminal
              ? JSON.stringify({
                  runId,
                  status: 'completed',
                  startedAt,
                  completedAt,
                  stepCount: 1,
                  approvalCount: 0,
                  artifactCount: 0,
                  outcome: {
                    result: 'success',
                    summaryText: 'Reconnect flow completed after stream recovery.',
                  },
                })
              : JSON.stringify({ message: 'Summary not ready' }),
          };
        }

        if (url.pathname === `/api/dax/runs/${runId}/events` && request.method() === 'GET') {
          const cursor = url.searchParams.get('cursor') ?? '';
          seenEventCursors.push(cursor);

          if (!cursor) {
            return {
              status: 200,
              contentType: 'text/event-stream',
              headers: {
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
              },
              body: `event: run.event\nid: cursor-1\ndata: ${JSON.stringify({
                schemaVersion: 'v1',
                eventId: 'evt-1',
                sequence: 1,
                cursor: 'cursor-1',
                runId,
                type: 'step.started',
                timestamp: stepTimestamp,
                payload: {
                  stepId: 'step-1',
                  title: 'Reconnect check',
                  detail: 'First chunk before disconnect',
                },
              })}\n\n`,
            };
          }

          if (cursor === 'cursor-1') {
            await new Promise((resolve) => setTimeout(resolve, 400));
            terminal = true;
            return {
              status: 200,
              contentType: 'text/event-stream',
              headers: {
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
              },
              body: `event: run.event\nid: cursor-2\ndata: ${JSON.stringify({
                schemaVersion: 'v1',
                eventId: 'evt-2',
                sequence: 2,
                cursor: 'cursor-2',
                runId,
                type: 'run.completed',
                timestamp: completedAt,
                payload: {},
              })}\n\n`,
            };
          }
        }

        return null;
      },
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(`/runs/${runId}`);

    await expect(page.getByText('Stream live')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('step.started')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('run.completed')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Reconnect flow completed after stream recovery.')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('completed').first()).toBeVisible({ timeout: 30_000 });

    expect(seenEventCursors).toContain('cursor-1');
    expect(seenEventCursors.at(-1)).toBe('cursor-1');
    await expect(page.getByText('step.started')).toHaveCount(1);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('rehydrates pending approval truth after reconnect', async ({ page }) => {
    const runId = 'ses_reconnect_approval_mock';
    const createdAt = '2026-03-19T12:30:00.000Z';
    const approvalAt = '2026-03-19T12:30:01.000Z';
    const seenEventCursors: string[] = [];
    let approvalVisible = false;

    await seedClientState(page);
    await bridgeApiToIpv6(page, {
      handle: async (request) => {
        const url = new URL(request.url());
        if (url.pathname === `/api/dax/runs/${runId}` && request.method() === 'GET') {
          return {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schemaVersion: 'v1',
              authority: 'dax',
              runId,
              status: approvalVisible ? 'waiting_approval' : 'running',
              createdAt,
              updatedAt: approvalAt,
              startedAt: createdAt,
              title: 'Reconnect approval test run',
              currentStep: {
                stepId: 'step-approval',
                status: approvalVisible ? 'running' : 'running',
                title: 'Approval checkpoint',
              },
              pendingApprovalCount: approvalVisible ? 1 : 0,
              artifactSummary: { total: 0 },
              lastEvent: approvalVisible
                ? {
                    eventId: 'evt-approval-1',
                    sequence: 1,
                    cursor: 'cursor-approval-1',
                    timestamp: approvalAt,
                  }
                : null,
            }),
          };
        }

        if (url.pathname === `/api/dax/runs/${runId}/approvals` && request.method() === 'GET') {
          return {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              runId,
              approvals: approvalVisible
                ? [
                    {
                      approvalId: 'per-approval-1',
                      runId,
                      type: 'command_execute',
                      status: 'pending',
                      risk: 'high',
                      title: 'Approve reconnect test command',
                      reason: 'Shell execution now requires approval after reconnect.',
                      createdAt: approvalAt,
                      updatedAt: approvalAt,
                    },
                  ]
                : [],
            }),
          };
        }

        if (url.pathname === `/api/dax/runs/${runId}/summary` && request.method() === 'GET') {
          return {
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Summary not ready' }),
          };
        }

        if (url.pathname === `/api/dax/runs/${runId}/events` && request.method() === 'GET') {
          const cursor = url.searchParams.get('cursor') ?? '';
          seenEventCursors.push(cursor);

          if (!cursor) {
            approvalVisible = true;
            return {
              status: 200,
              contentType: 'text/event-stream',
              headers: {
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
              },
              body: `event: run.event\nid: cursor-approval-1\ndata: ${JSON.stringify({
                schemaVersion: 'v1',
                eventId: 'evt-approval-1',
                sequence: 1,
                cursor: 'cursor-approval-1',
                runId,
                type: 'approval.requested',
                timestamp: approvalAt,
                payload: {
                  approvalId: 'per-approval-1',
                  title: 'Approve reconnect test command',
                  reason: 'Shell execution now requires approval after reconnect.',
                },
              })}\n\n`,
            };
          }

          if (cursor === 'cursor-approval-1') {
            await new Promise((resolve) => setTimeout(resolve, 400));
            return {
              status: 200,
              contentType: 'text/event-stream',
              headers: {
                'cache-control': 'no-cache, no-transform',
                connection: 'keep-alive',
              },
              body: '',
            };
          }
        }

        return null;
      },
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@soothsayer.local');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(`/runs/${runId}`);

    await expect(page.getByText('approval.requested')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Approval Required' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('Shell execution now requires approval after reconnect.', { exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Run is paused for approval.')).toBeVisible({ timeout: 30_000 });

    expect(seenEventCursors.length).toBeGreaterThan(1);
    await expect(page.getByText('approval.requested')).toHaveCount(1);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

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

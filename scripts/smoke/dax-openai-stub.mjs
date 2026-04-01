import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.SMOKE_STUB_PORT || '4096');

const state = {
  daxRunCreateCount: 0,
  openAiChatCount: 0,
  runs: [],
  openAiRequests: [],
};

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function resetState() {
  state.daxRunCreateCount = 0;
  state.openAiChatCount = 0;
  state.runs = [];
  state.openAiRequests = [];
}

function buildRunSummary(run) {
  return {
    runId: run.runId,
    status: 'completed',
    startedAt: run.createdAt,
    completedAt: run.completedAt,
    stepCount: 1,
    approvalCount: 0,
    artifactCount: 0,
    outcome: {
      result: 'success',
      summaryText: `DAX stub response for ${run.runId}.`,
    },
  };
}

function buildRunDetail(run) {
  return {
    runId: run.runId,
    status: 'completed',
    sourceSystem: 'dax',
    createdAt: run.createdAt,
    updatedAt: run.completedAt,
    startedAt: run.createdAt,
    completedAt: run.completedAt,
    title: run.title,
    approvals: {
      pending: 0,
    },
    trust: {
      posture: 'strong',
      blocked: false,
      postureDescription: 'Smoke stub completed successfully.',
    },
    artifacts: {
      total: 0,
      latestIds: [],
    },
    metadata: {
      executionProfile: {
        personaId: run.personaId,
        provider: 'dax',
        model: run.model,
        approvalMode: run.approvalMode,
        riskLevel: run.riskLevel,
        isFallback: false,
      },
    },
    lastEvent: null,
  };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const { pathname } = url;

  if (request.method === 'GET' && (pathname === '/health' || pathname === '/global/health')) {
    json(response, 200, { healthy: true, version: 'smoke-stub' });
    return;
  }

  if (request.method === 'GET' && pathname === '/__smoke/state') {
    json(response, 200, state);
    return;
  }

  if (request.method === 'POST' && pathname === '/__smoke/reset') {
    resetState();
    json(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && pathname === '/runs') {
    const payload = await readJson(request);
    state.daxRunCreateCount += 1;
    const runId = `run-${String(state.daxRunCreateCount).padStart(4, '0')}`;
    const createdAt = new Date().toISOString();
    const completedAt = new Date(Date.now() + 250).toISOString();
    const run = {
      runId,
      createdAt,
      completedAt,
      title: String(payload?.intent?.input || 'Smoke run').slice(0, 80),
      payload,
      model: payload?.personaPreset?.modelHint || 'gemini-2.5-pro',
      personaId: payload?.personaPreset?.personaId || 'standard',
      approvalMode: payload?.personaPreset?.approvalMode || 'strict',
      riskLevel: payload?.personaPreset?.riskLevel || 'medium',
    };
    state.runs.push(run);

    json(response, 200, {
      runId,
      status: 'created',
      createdAt,
    });
    return;
  }

  if (request.method === 'GET' && pathname.startsWith('/soothsayer/runs/')) {
    const match = pathname.match(/^\/soothsayer\/runs\/([^/]+)(?:\/approvals|\/recovery)?$/);
    const approvalMatch = pathname.match(/^\/soothsayer\/runs\/([^/]+)\/approvals$/);

    if (approvalMatch) {
      json(response, 200, []);
      return;
    }

    if (match) {
      const runId = decodeURIComponent(match[1]);
      const run = state.runs.find((entry) => entry.runId === runId);
      if (!run) {
        json(response, 404, { message: 'Run not found' });
        return;
      }

      json(response, 200, buildRunDetail(run));
      return;
    }
  }

  if (request.method === 'GET' && pathname.startsWith('/runs/')) {
    const summaryMatch = pathname.match(/^\/runs\/([^/]+)\/summary$/);
    const artifactsMatch = pathname.match(/^\/runs\/([^/]+)\/artifacts$/);
    const eventsMatch = pathname.match(/^\/runs\/([^/]+)\/events$/);

    if (summaryMatch) {
      const runId = decodeURIComponent(summaryMatch[1]);
      const run = state.runs.find((entry) => entry.runId === runId);
      if (!run) {
        json(response, 404, { message: 'Run not found' });
        return;
      }

      json(response, 200, buildRunSummary(run));
      return;
    }

    if (artifactsMatch) {
      json(response, 200, []);
      return;
    }

    if (eventsMatch) {
      response.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'close',
      });
      response.end('');
      return;
    }
  }

  if (request.method === 'POST' && pathname === '/openai/v1/chat/completions') {
    const payload = await readJson(request);
    state.openAiChatCount += 1;
    state.openAiRequests.push(payload);

    json(response, 200, {
      choices: [
        {
          message: {
            content: 'OpenAI fallback stub response.',
          },
        },
      ],
    });
    return;
  }

  json(response, 404, { message: `Unhandled smoke stub route: ${request.method} ${pathname}` });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Smoke DAX/OpenAI stub listening on http://127.0.0.1:${port}`);
});

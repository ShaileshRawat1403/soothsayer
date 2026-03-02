import { ConfigService } from '@nestjs/config';
import { McpService } from './mcp.service';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createConfigService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    MCP_ENABLED: true,
    MCP_MAX_CONCURRENT_CALLS: 1,
    MCP_MAX_QUEUE_SIZE: 1,
    MCP_MAX_QUEUE_WAIT_MS: 1000,
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

describe('McpService concurrency limits', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('queues a second call and executes it after the first finishes', async () => {
    const service = new McpService(createConfigService());
    const first = createDeferred<{ ok: number }>();

    const processSpy = jest
      .spyOn(service as any, 'callToolProcess')
      .mockImplementationOnce(async () => first.promise)
      .mockImplementationOnce(async () => ({ ok: 2 }));

    const p1 = service.callTool('repo_search', {});
    const p2 = service.callTool('repo_search', {});

    await Promise.resolve();
    expect(processSpy).toHaveBeenCalledTimes(1);

    first.resolve({ ok: 1 });

    await expect(p1).resolves.toEqual({ ok: 1 });
    await expect(p2).resolves.toEqual({ ok: 2 });
    expect(processSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects immediately when queue capacity is exceeded', async () => {
    const service = new McpService(
      createConfigService({
        MCP_MAX_CONCURRENT_CALLS: 1,
        MCP_MAX_QUEUE_SIZE: 0,
      }),
    );
    const first = createDeferred<{ ok: boolean }>();

    jest
      .spyOn(service as any, 'callToolProcess')
      .mockImplementationOnce(async () => first.promise);

    const p1 = service.callTool('workspace_info', {});
    await Promise.resolve();

    await expect(service.callTool('workspace_info', {})).rejects.toThrow('MCP queue is full');

    first.resolve({ ok: true });
    await expect(p1).resolves.toEqual({ ok: true });
  });

  it('fails queued calls that wait beyond queue timeout', async () => {
    jest.useFakeTimers();

    const service = new McpService(
      createConfigService({
        MCP_MAX_CONCURRENT_CALLS: 1,
        MCP_MAX_QUEUE_SIZE: 2,
        MCP_MAX_QUEUE_WAIT_MS: 50,
      }),
    );
    const first = createDeferred<{ ok: boolean }>();

    jest
      .spyOn(service as any, 'callToolProcess')
      .mockImplementationOnce(async () => first.promise);

    const p1 = service.callTool('workspace_info', {});
    const p2 = service.callTool('workspace_info', {});

    await Promise.resolve();
    jest.advanceTimersByTime(60);
    await Promise.resolve();

    await expect(p2).rejects.toThrow('MCP queue wait exceeded 50ms');

    first.resolve({ ok: true });
    await expect(p1).resolves.toEqual({ ok: true });
  });
});

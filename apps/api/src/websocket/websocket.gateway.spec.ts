import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketGateway auth enforcement', () => {
  const makeGateway = (overrides?: {
    nodeEnv?: string;
    allowDev?: boolean;
    verifyResult?: { sub?: string };
    activeUser?: boolean;
  }) => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue(overrides?.verifyResult ?? { sub: 'user-1' }),
    } as unknown as JwtService;

    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: overrides?.nodeEnv ?? 'development',
          WS_AUTH_ALLOW_IN_DEV: overrides?.allowDev ?? false,
        };
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
      }),
    } as unknown as ConfigService;

    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            overrides?.activeUser === false
              ? { id: 'user-1', isActive: false }
              : { id: 'user-1', isActive: true }
          ),
      },
    } as any;

    const gateway = new WebsocketGateway(jwtService, configService, prisma);
    return { gateway, jwtService, prisma };
  };

  const makeClient = (token?: string) => {
    return {
      id: 'socket-1',
      userId: undefined,
      handshake: {
        auth: token ? { token } : {},
        headers: {},
      },
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;
  };

  it('rejects unauthenticated connection by default', async () => {
    const { gateway } = makeGateway();
    const client = makeClient();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('allows unauthenticated connection only with explicit dev flag', async () => {
    const { gateway } = makeGateway({ allowDev: true });
    const client = makeClient();

    await gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('authenticates connection with valid JWT', async () => {
    const { gateway } = makeGateway();
    const client = makeClient('valid-token');

    await gateway.handleConnection(client);

    expect(client.userId).toBe('user-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('throws on protected events when socket is unauthenticated', () => {
    const { gateway } = makeGateway();
    const client = makeClient('valid-token');
    client.userId = undefined;

    expect(() => gateway.handleSubscribeCommand(client, { executionId: 'exec-1' })).toThrow(
      WsException
    );
  });
});

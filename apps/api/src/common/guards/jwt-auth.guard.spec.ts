import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(request: Record<string, unknown>) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('JwtAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;

  it('rejects AUTH_BYPASS in production', () => {
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          AUTH_BYPASS: true,
          NODE_ENV: 'production',
        };
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
      }),
    } as unknown as ConfigService;

    const guard = new JwtAuthGuard(reflector, config);
    const context = makeContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows bypass in non-production and injects dev user', () => {
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          AUTH_BYPASS: true,
          NODE_ENV: 'development',
          AUTH_BYPASS_EMAIL: 'admin@soothsayer.local',
          AUTH_BYPASS_NAME: 'Admin User',
        };
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
      }),
    } as unknown as ConfigService;

    const guard = new JwtAuthGuard(reflector, config);
    const request: Record<string, unknown> = {};
    const context = makeContext(request);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({
      id: 'dev-admin',
      email: 'admin@soothsayer.local',
      name: 'Admin User',
    });
  });
});

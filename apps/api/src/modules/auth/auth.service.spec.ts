import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';

describe('AuthService security flows', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    } as any;

    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: 'development',
          AUTH_BYPASS: false,
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
          PASSWORD_RESET_TOKEN_EXPIRATION: '1h',
        };
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
      }),
    } as unknown as ConfigService;

    const jwtService = {
      sign: jest.fn().mockReturnValue('access-token'),
    } as unknown as JwtService;

    const service = new AuthService(prisma, jwtService, config, {} as any);
    return { service, prisma, config, jwtService };
  };

  it('refreshes token by hashed refresh token and rotates hash', async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue({
      id: 's1',
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1', email: 'u@example.com', name: 'User', isActive: true },
    });
    prisma.session.update.mockResolvedValue({});

    const result = await service.refreshToken({ refreshToken: 'raw-refresh-token' });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBeTruthy();
    expect(prisma.session.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    );
    expect(prisma.session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshToken: null,
          refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
  });

  it('rejects refresh when token is invalid', async () => {
    const { service, prisma } = makeService();
    prisma.session.findFirst.mockResolvedValue(null);

    await expect(service.refreshToken({ refreshToken: 'bad' })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('hash-matches refresh token on targeted logout', async () => {
    const { service, prisma } = makeService();
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });

    await service.logout('u1', 'raw-refresh-token');

    const expectedHash = createHash('sha256').update('raw-refresh-token').digest('hex');
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        OR: [{ refreshTokenHash: expectedHash }, { refreshToken: 'raw-refresh-token' }],
      },
    });
  });

  it('stores hashed password reset token with expiry', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.user.update.mockResolvedValue({});

    await service.forgotPassword({ email: 'user@example.com' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          passwordResetTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          passwordResetExpiresAt: expect.any(Date),
          passwordResetUsedAt: null,
        }),
      })
    );
  });

  it('rejects reset with invalid token', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'bad', password: 'NewSecurePass123!' })
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects reset with expired token', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordResetExpiresAt: new Date(Date.now() - 1_000),
      passwordResetUsedAt: null,
    });

    await expect(
      service.resetPassword({ token: 'expired', password: 'NewSecurePass123!' })
    ).rejects.toThrow('Invalid or expired reset token');
  });

  it('rejects reset when token was already used', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
      passwordResetUsedAt: new Date(),
    });

    await expect(
      service.resetPassword({ token: 'used', password: 'NewSecurePass123!' })
    ).rejects.toThrow('Reset token has already been used');
  });
});

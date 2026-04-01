import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandsService } from './commands.service';

describe('CommandsService executeTerminal hardening', () => {
  const makeService = () => {
    const prisma = {
      workspaceMember: {
        findUnique: jest.fn().mockResolvedValue({ id: 'member-1' }),
      },
      workspace: {
        findUnique: jest.fn().mockResolvedValue({ settings: { rootPath: process.cwd() } }),
      },
      command: {
        findFirst: jest.fn(),
      },
    } as any;

    const config = {
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService;

    const service = new CommandsService(prisma, config);
    return { service, prisma };
  };

  it('rejects freeform commands that are not allowlisted', async () => {
    const { service, prisma } = makeService();
    prisma.command.findFirst.mockResolvedValue(null);

    await expect(service.executeTerminal('user-1', 'workspace-1', 'rm -rf .', '.')).rejects.toThrow(
      ForbiddenException
    );
  });

  it('executes a safe freeform command inside the workspace root', async () => {
    const { service, prisma } = makeService();
    prisma.command.findFirst.mockResolvedValue(null);
    jest.spyOn(service as any, 'runCommandWithGuards').mockResolvedValue({
      stdout: 'On branch main',
      stderr: '',
      exitCode: 0,
      durationMs: 12,
      timedOut: false,
      truncated: false,
    });

    const result = await service.executeTerminal('user-1', 'workspace-1', 'git status', '.');

    expect(result.status).toBe('completed');
    expect(result.command).toBe('git status');
    expect(result.executionMode).toBe('direct');
  });

  it('rejects cwd outside workspace root', async () => {
    const { service, prisma } = makeService();
    prisma.command.findFirst.mockResolvedValue({
      id: 'cmd-1',
      name: 'list-files',
      template: 'ls',
      timeout: 1000,
    });

    await expect(
      service.executeTerminal('user-1', 'workspace-1', 'list-files', '../')
    ).rejects.toThrow('Working directory is outside workspace root');
  });

  it('executes an allowlisted command template inside safe cwd', async () => {
    const { service, prisma } = makeService();
    prisma.command.findFirst.mockResolvedValue({
      id: 'cmd-1',
      name: 'list-files',
      template: 'ls',
      timeout: 2000,
    });

    jest.spyOn(service as any, 'runCommandWithGuards').mockResolvedValue({
      stdout: 'file1\nfile2',
      stderr: '',
      exitCode: 0,
      durationMs: 10,
      timedOut: false,
      truncated: false,
    });

    const result = await service.executeTerminal('user-1', 'workspace-1', 'list-files', '.');

    expect(result.status).toBe('completed');
    expect(result.commandName).toBe('list-files');
    expect(result.cwd).toBe(process.cwd());
  });

  it('executes seeded preflight allowlisted command by name', async () => {
    const { service, prisma } = makeService();
    prisma.command.findFirst.mockResolvedValue({
      id: 'cmd-preflight',
      name: 'Preflight Health Check',
      template: 'echo PRECHECK_OK',
      timeout: 10000,
    });

    jest.spyOn(service as any, 'runCommandWithGuards').mockResolvedValue({
      stdout: 'PRECHECK_OK\n',
      stderr: '',
      exitCode: 0,
      durationMs: 8,
      timedOut: false,
      truncated: false,
    });

    const result = await service.executeTerminal(
      'user-1',
      'workspace-1',
      'Preflight Health Check',
      '.'
    );

    expect(result.status).toBe('completed');
    expect(result.commandId).toBe('cmd-preflight');
    expect(result.commandName).toBe('Preflight Health Check');
  });
});

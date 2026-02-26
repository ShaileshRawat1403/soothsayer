import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly isEnabled: boolean;
  private readonly dockerImage: string;

  constructor(private config: ConfigService) {
    this.isEnabled = this.config.get('SANDBOX_ENABLED', false);
    this.dockerImage = this.config.get('SANDBOX_IMAGE', 'node:18-alpine');
  }

  /**
   * Executes a command. If sandbox is enabled, wraps it in Docker.
   * Otherwise, runs directly (legacy/dev mode).
   */
  async execute(
    command: string,
    cwd: string,
    onOutput: (data: string) => void,
    onError: (data: string) => void
  ): Promise<number> {
    if (!this.isEnabled) {
      this.logger.warn(`Executing command UNSANDBOXED: ${command}`);
      return this.runNative(command, cwd, onOutput, onError);
    }

    return this.runInDocker(command, cwd, onOutput, onError);
  }

  private runInDocker(
    command: string,
    hostCwd: string,
    onOutput: (data: string) => void,
    onError: (data: string) => void
  ): Promise<number> {
    const containerName = `soothsayer-${uuidv4().slice(0, 8)}`;

    // Mount the workspace: Host Path -> /app inside container
    const args = [
      'run',
      '--rm', // Auto-delete container on exit
      '--name',
      containerName,
      '--network',
      'none', // No internet access (secure default)
      '--cpus',
      '1.0', // Limit CPU
      '--memory',
      '512m', // Limit RAM
      '-v',
      `${hostCwd}:/app`, // Mount volume
      '-w',
      '/app', // Set working dir
      this.dockerImage, // Image (e.g., node:18-alpine)
      '/bin/sh',
      '-c',
      command, // The command
    ];

    this.logger.log(`Spawning sandbox: ${containerName}`);

    return new Promise((resolve) => {
      const child = spawn('docker', args);

      child.stdout.on('data', (d) => onOutput(d.toString()));
      child.stderr.on('data', (d) => onError(d.toString()));

      child.on('close', (code) => {
        this.logger.log(`Sandbox ${containerName} exited with code ${code}`);
        resolve(code ?? 1);
      });
    });
  }

  private runNative(
    command: string,
    cwd: string,
    onOutput: (d: string) => void,
    onError: (d: string) => void
  ): Promise<number> {
    // ... existing native implementation would go here
    // For now, we just return error to force sandbox usage in prod
    onError('Native execution disabled in this configuration snippet.');
    return Promise.resolve(1);
  }
}

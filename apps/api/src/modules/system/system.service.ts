import { Injectable, Logger } from '@nestjs/common';
import * as si from 'systeminformation';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  async getStats() {
    try {
      const [cpu, mem, fs, graphics] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.graphics(),
      ]);

      // Calculate total disk usage
      const totalDisk = fs.reduce((acc, curr) => acc + curr.size, 0);
      const usedDisk = fs.reduce((acc, curr) => acc + curr.used, 0);

      return {
        cpu: {
          load: Math.round(cpu.currentLoad),
          cores: cpu.cpus.map(c => Math.round(c.load)),
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          percentage: Math.round((mem.used / mem.total) * 100),
        },
        storage: {
          total: totalDisk,
          used: usedDisk,
          percentage: Math.round((usedDisk / totalDisk) * 100),
        },
        gpu: graphics.controllers.length > 0 ? {
          name: graphics.controllers[0].model,
          vram: graphics.controllers[0].vram,
          utilization: graphics.controllers[0].utilizationGpu || 0,
          temperature: graphics.controllers[0].temperatureGpu || 0,
        } : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch system stats', error);
      return null;
    }
  }
}

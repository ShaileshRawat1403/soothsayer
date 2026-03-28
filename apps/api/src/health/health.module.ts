import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DaxModule } from '../modules/dax/dax.module';
import { QueueHealthService } from './queue-health.service';

@Module({
  imports: [DaxModule],
  controllers: [HealthController],
  providers: [QueueHealthService],
})
export class HealthModule {}

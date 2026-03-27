import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DaxModule } from '../dax/dax.module';

@Module({
  imports: [DaxModule],
  controllers: [HealthController],
})
export class HealthModule {}

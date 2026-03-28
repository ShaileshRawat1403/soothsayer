import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEmitter, AnalyticsListener } from './analytics.emitter';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsEmitter, AnalyticsListener],
  exports: [AnalyticsService, AnalyticsEmitter],
})
export class AnalyticsModule {}

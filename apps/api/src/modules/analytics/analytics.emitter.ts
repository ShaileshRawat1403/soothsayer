import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

export enum AnalyticsEventType {
  RUN_CREATED = 'run.created',
  RUN_COMPLETED = 'run.completed',
  RUN_FAILED = 'run.failed',
  APPROVAL_REQUESTED = 'approval.requested',
  APPROVAL_RESOLVED = 'approval.resolved',
  PROVIDER_FAILURE = 'provider.failure',
  HANDOFF_TRIGGERED = 'handoff.triggered',
}

@Injectable()
export class AnalyticsEmitter {
  constructor(private eventEmitter: EventEmitter2) {}

  emit(type: AnalyticsEventType, payload: any) {
    this.eventEmitter.emit(type, payload);
  }
}

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('**')
  async handleAllEvents(payload: any) {
    // This listener can be expanded to store all events in a canonical table
    // For now, it logs the event type
  }

  @OnEvent(AnalyticsEventType.RUN_CREATED)
  async handleRunCreated(payload: any) {
    await this.trackEvent(AnalyticsEventType.RUN_CREATED, payload);
  }

  @OnEvent(AnalyticsEventType.RUN_COMPLETED)
  async handleRunCompleted(payload: any) {
    await this.trackEvent(AnalyticsEventType.RUN_COMPLETED, payload);
  }

  @OnEvent(AnalyticsEventType.RUN_FAILED)
  async handleRunFailed(payload: any) {
    await this.trackEvent(AnalyticsEventType.RUN_FAILED, payload);
  }

  @OnEvent(AnalyticsEventType.PROVIDER_FAILURE)
  async handleProviderFailure(payload: any) {
    await this.trackEvent(AnalyticsEventType.PROVIDER_FAILURE, payload);
  }

  private async trackEvent(eventType: string, payload: any) {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          workspaceId: payload.workspaceId,
          userId: payload.userId || 'system',
          eventType,
          properties: payload,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track canonical event: ${eventType}`, error);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotificationEventOutbox } from './entities/notification-event-outbox.entity';
import {
  NotificationBatchStatus,
  NotificationEventStatus,
  NotificationPriority,
  NotificationRouteTarget,
  NotificationType,
} from '../common/enums/notification.enums';
import { NotificationBatch } from './entities/notification-batch.entity';
import { NotificationRoutingService } from './notification-routing.service';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationCenterService } from './notification-center.service';
import { NotificationCopyService } from './notification-copy.service';

type BatchCandidate = {
  type: NotificationType;
  routeTarget: NotificationRouteTarget;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  priority: NotificationPriority;
  dedupeHours: number;
  suppressPushWhenDedupedBy?: {
    type: NotificationType;
    dedupeKey: string;
  };
};

@Injectable()
export class NotificationAggregatorService {
  private readonly logger = new Logger(NotificationAggregatorService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notificationRoutingService: NotificationRoutingService,
    private readonly notificationPolicyService: NotificationPolicyService,
    private readonly notificationCenterService: NotificationCenterService,
    private readonly notificationCopyService: NotificationCopyService,
  ) {}

  @Cron('*/1 * * * *', { name: 'notification-aggregate-outbox' })
  async processPendingEvents(): Promise<void> {
    const events = await this.em.find(
      NotificationEventOutbox,
      {
        status: NotificationEventStatus.PENDING,
        availableAt: { $lte: new Date() },
      },
      {
        populate: ['user'],
        orderBy: [{ createdAt: 'asc' }],
        limit: 500,
      },
    );

    if (events.length === 0) {
      return;
    }

    const grouped = new Map<string, NotificationEventOutbox[]>();
    for (const event of events) {
      const key = `${event.user.id}:${event.type}`;
      const current = grouped.get(key) ?? [];
      current.push(event);
      grouped.set(key, current);
    }

    for (const groupEvents of grouped.values()) {
      await this.aggregateGroup(groupEvents);
    }

    await this.em.flush();
  }

  private async aggregateGroup(
    events: NotificationEventOutbox[],
  ): Promise<void> {
    const first = events[0];
    const candidate = this.buildCandidate(events);
    if (!candidate) {
      for (const event of events) {
        event.status = NotificationEventStatus.SKIPPED;
        event.processedAt = new Date();
        event.errorMessage = 'unsupported_type';
      }
      return;
    }

    const decision = await this.notificationPolicyService.evaluate({
      user: first.user,
      type: candidate.type,
      priority: candidate.priority,
      dedupeKey: candidate.dedupeKey,
      dedupeHours: candidate.dedupeHours,
      suppressPushWhenDedupedBy: candidate.suppressPushWhenDedupedBy,
    });

    if (decision.decision === 'SKIP') {
      for (const event of events) {
        event.status = NotificationEventStatus.SKIPPED;
        event.processedAt = new Date();
        event.errorMessage = decision.reason;
      }
      this.logger.log(
        `notification skipped user=${first.user.id} type=${candidate.type} reason=${decision.reason}`,
      );
      return;
    }

    const batch = new NotificationBatch();
    batch.user = first.user;
    batch.type = candidate.type;
    batch.routeTarget = candidate.routeTarget;
    batch.title = candidate.title;
    batch.body = candidate.body;
    batch.payload = candidate.payload;
    batch.priority = candidate.priority;
    batch.dedupeKey = candidate.dedupeKey;
    batch.sendAfter = new Date();

    if (decision.decision === 'CENTER_ONLY') {
      batch.status = NotificationBatchStatus.SKIPPED;
      batch.skippedReason = decision.reason;
      await this.notificationCenterService.createNotification({
        user: first.user,
        type: candidate.type,
        routeTarget: candidate.routeTarget,
        title: candidate.title,
        body: candidate.body,
        payload: candidate.payload,
        priority: candidate.priority,
      });
    }

    this.em.persist(batch);

    for (const event of events) {
      event.status = NotificationEventStatus.PROCESSED;
      event.processedAt = new Date();
      event.errorMessage = null;
    }

    this.logger.log(
      `notification batch created user=${first.user.id} type=${candidate.type} status=${batch.status}`,
    );
  }

  private buildCandidate(
    events: NotificationEventOutbox[],
  ): BatchCandidate | null {
    const type = events[0].type;

    if (type === NotificationType.TASKS_GENERATED) {
      const actionTaskIds = events
        .map((event) => this.readString(event.payload.taskId))
        .filter((value): value is string => Boolean(value));
      const bedIds = [
        ...new Set(
          events
            .map((event) => this.readString(event.payload.bedId))
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const plantingIds = [
        ...new Set(
          events
            .map((event) => this.readString(event.payload.plantingId))
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      const routeTarget = this.notificationRoutingService.pickTasksRouteTarget({
        bedIds,
        plantingIds,
      });
      const targetId = plantingIds[0] ?? bedIds[0] ?? 'planner';
      const dedupeWindow = new Date().toISOString().slice(0, 13);
      const copy = this.notificationCopyService.buildTasksGeneratedCopy(
        actionTaskIds.length,
      );

      return {
        type,
        routeTarget,
        title: copy.title,
        body: copy.body,
        payload: {
          actionTaskIds,
          bedIds,
          plantingIds,
          bedId: bedIds[0] ?? null,
          plantingId: plantingIds[0] ?? null,
        },
        dedupeKey: `${events[0].user.id}:${type}:${routeTarget}:${targetId}:${dedupeWindow}`,
        priority: events.some(
          (event) => event.priority === NotificationPriority.HIGH,
        )
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL,
        dedupeHours: 2,
      };
    }

    if (type === NotificationType.DAILY_TASKS_SUMMARY) {
      const ids = events.flatMap((item) =>
        this.readStringArray(item.payload.actionTaskIds),
      );
      const uniqIds = [...new Set(ids)];
      const day = new Date().toISOString().slice(0, 10);
      const copy = this.notificationCopyService.buildDailySummaryCopy(
        uniqIds.length,
      );
      return {
        type,
        routeTarget: NotificationRouteTarget.PLANNER,
        title: copy.title,
        body: copy.body,
        payload: { actionTaskIds: uniqIds },
        dedupeKey: `${events[0].user.id}:${type}:${day}`,
        priority: NotificationPriority.NORMAL,
        dedupeHours: 24,
      };
    }

    if (type === NotificationType.WEATHER_STATUS_CHANGED) {
      const weatherStatusCode = this.readString(
        events[events.length - 1].payload.weatherStatusCode,
      );
      const copy =
        this.notificationCopyService.buildWeatherStatusChangedCopy(
          weatherStatusCode,
        );
      return {
        type,
        routeTarget: NotificationRouteTarget.WEATHER,
        title: copy.title,
        body: copy.body,
        payload: { weatherStatusCode },
        dedupeKey: `${events[0].user.id}:${type}:${weatherStatusCode ?? 'NA'}`,
        priority: events[events.length - 1].priority,
        dedupeHours: 4,
      };
    }

    if (type === NotificationType.GARDEN_RISK_CHANGED) {
      const latestPayload = events[events.length - 1].payload;
      const riskReason =
        this.readString(latestPayload.riskReason) ??
        this.readString(latestPayload.gardenRiskCode);
      const riskLevel =
        this.readString(latestPayload.riskLevel) ??
        this.notificationCopyService.mapPriorityToRiskLevel(
          events[events.length - 1].priority,
        );
      const warningCode = this.readString(latestPayload.warningCode);
      const copy =
        this.notificationCopyService.buildGardenRiskChangedCopy(riskReason);
      const weatherAlertCoverageKey = this.readString(
        latestPayload.weatherAlertCoverageKey,
      );

      return {
        type,
        routeTarget: NotificationRouteTarget.GARDEN_RISK,
        title: copy.title,
        body: copy.body,
        payload: {
          riskLevel,
          riskReason,
          warningCode,
          warningCodes: this.readStringArray(latestPayload.warningCodes),
          gardenRiskCode: this.readString(latestPayload.gardenRiskCode),
          validFrom: this.readString(latestPayload.validFrom),
          validTo: this.readString(latestPayload.validTo),
        },
        dedupeKey:
          events[events.length - 1].dedupeKey ||
          `${events[0].user.id}:${type}:${riskReason ?? 'NA'}`,
        priority: events[events.length - 1].priority,
        dedupeHours: 12,
        suppressPushWhenDedupedBy: weatherAlertCoverageKey
          ? {
              type: NotificationType.WEATHER_ALERTS_SUMMARY,
              dedupeKey: weatherAlertCoverageKey,
            }
          : undefined,
      };
    }

    if (type === NotificationType.WEATHER_ALERTS_SUMMARY) {
      const warningIds = events.flatMap((item) =>
        this.readStringArray(item.payload.warningIds),
      );
      const latestPayload = events[events.length - 1].payload;
      const warningReasons = this.readStringArray(latestPayload.warningReasons);
      const primaryWarningReason =
        this.readString(latestPayload.primaryWarningReason) ??
        warningReasons[0] ??
        null;
      const copy = this.notificationCopyService.buildWeatherAlertsSummaryCopy(
        warningIds.length,
        primaryWarningReason,
      );
      return {
        type,
        routeTarget: NotificationRouteTarget.WEATHER_ALERTS,
        title: copy.title,
        body: copy.body,
        payload: {
          warningIds: [...new Set(warningIds)],
          warningCodes: this.readStringArray(latestPayload.warningCodes),
          warningReasons,
          primaryWarningReason,
          validFrom: this.readString(latestPayload.validFrom),
          validTo: this.readString(latestPayload.validTo),
        },
        dedupeKey:
          events[events.length - 1].dedupeKey ||
          `${events[0].user.id}:${type}:${primaryWarningReason ?? 'GENERIC'}`,
        priority: NotificationPriority.HIGH,
        dedupeHours: 8,
      };
    }

    if (type === NotificationType.ARTICLE_RECOMMENDED) {
      const articleIds = [
        ...new Set(
          events
            .map((event) => this.readString(event.payload.articleId))
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const articleSlugs = [
        ...new Set(
          events
            .map((event) => this.readString(event.payload.articleSlug))
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const routeTarget =
        this.notificationRoutingService.pickArticleRouteTarget(
          articleIds.length,
        );
      const copy = this.notificationCopyService.buildArticleRecommendedCopy(
        articleIds.length,
      );

      return {
        type,
        routeTarget,
        title: copy.title,
        body: copy.body,
        payload: {
          articleId: articleIds[0] ?? null,
          articleSlug: articleSlugs[0] ?? null,
          articleIds,
        },
        dedupeKey: `${events[0].user.id}:${type}:${articleIds.sort().join(',')}`,
        priority: NotificationPriority.NORMAL,
        dedupeHours: 18,
      };
    }

    if (type === NotificationType.LIFECYCLE_SUGGESTION) {
      const suggestion =
        this.readString(events[0].payload.suggestedAction) ??
        'aktualizacja cyklu';
      const copy =
        this.notificationCopyService.buildLifecycleSuggestionCopy(suggestion);
      return {
        type,
        routeTarget: this.readString(events[0].payload.plantingId)
          ? NotificationRouteTarget.PLANTING_DETAIL
          : NotificationRouteTarget.BED_DETAIL,
        title: copy.title,
        body: copy.body,
        payload: events[0].payload,
        dedupeKey: events[0].dedupeKey,
        priority: events[0].priority,
        dedupeHours: 24 * 14,
      };
    }

    if (type === NotificationType.WEEKLY_DIGEST) {
      const copy = this.notificationCopyService.buildWeeklyDigestCopy();
      return {
        type,
        routeTarget: NotificationRouteTarget.NOTIFICATION_CENTER,
        title: copy.title,
        body: copy.body,
        payload: events[events.length - 1].payload,
        dedupeKey: events[events.length - 1].dedupeKey,
        priority: NotificationPriority.NORMAL,
        dedupeHours: 24 * 8,
      };
    }

    return null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}

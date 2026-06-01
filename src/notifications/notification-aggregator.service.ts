import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotificationEventOutbox } from './entities/notification-event-outbox.entity';
import {
  NotificationBatchStatus,
  NotificationDeliveryPolicy,
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
  userIntentKey: string | null;
  priority: NotificationPriority;
  deliveryPolicy: NotificationDeliveryPolicy;
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
    // Atomically claim a batch of PENDING events by updating their status to
    // PROCESSING in a single UPDATE. This prevents concurrent cron runs from
    // processing the same events and creating duplicate batches.
    const claimResult = await this.em.getConnection().execute(
      `UPDATE notification_event_outbox
       SET status = 'PROCESSING'
       WHERE id IN (
         SELECT id FROM notification_event_outbox
         WHERE status = 'PENDING' AND available_at <= NOW()
         ORDER BY created_at ASC
         LIMIT 500
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
    );

    if (claimResult.length === 0) {
      return;
    }

    const claimedIds = claimResult.map((row: { id: string }) => row.id);

    const events = await this.em.find(
      NotificationEventOutbox,
      { id: { $in: claimedIds } },
      {
        populate: ['user'],
        orderBy: [{ createdAt: 'asc' }],
      },
    );

    if (events.length === 0) {
      return;
    }

    const grouped = new Map<string, NotificationEventOutbox[]>();
    for (const event of events) {
      // Group by userIntentKey when available — this is the key aggregation mechanism.
      // Multiple per-task events (e.g. 3 watering tasks) collapse into one batch.
      // Fall back to userId:type for legacy events without an intent key.
      const key = event.userIntentKey
        ? `${event.user.id}:intent:${event.userIntentKey}`
        : `${event.user.id}:${event.type}`;
      const current = grouped.get(key) ?? [];
      current.push(event);
      grouped.set(key, current);
    }

    const sortedGroups = [...grouped.values()].sort((a, b) => {
      const rank = (type: NotificationType): number => {
        if (type === NotificationType.WEATHER_ALERTS_SUMMARY) return 0;
        if (type === NotificationType.GARDEN_RISK_CHANGED) return 1;
        if (type === NotificationType.WEATHER_STATUS_CHANGED) return 2;
        return 10;
      };

      return rank(a[0].type) - rank(b[0].type);
    });

    for (const groupEvents of sortedGroups) {
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
      userIntentKey: candidate.userIntentKey,
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
    batch.userIntentKey = candidate.userIntentKey;
    batch.deliveryPolicy = candidate.deliveryPolicy;
    batch.sendAfter = new Date();

    if (candidate.deliveryPolicy === NotificationDeliveryPolicy.PLAN_ONLY) {
      // PLAN_ONLY: tasks are tracked in the app but not surfaced to the user
      // as a notification or notification center entry
      batch.status = NotificationBatchStatus.SKIPPED;
      batch.skippedReason = 'plan_only';
    } else if (decision.decision === 'CENTER_ONLY') {
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

      // Intent-based aggregation: use the userIntentKey from the events to decide
      // copy and delivery policy. All events in the group share the same userIntentKey.
      const userIntentKey =
        events[0].userIntentKey ??
        this.readString(events[0].payload.userIntentKey);

      const deliveryPolicy = this.resolveTasksDeliveryPolicy(userIntentKey);

      const copy = this.buildTasksIntentCopy(
        userIntentKey,
        bedIds.length,
        plantingIds.length,
        actionTaskIds.length,
      );

      const routeTarget = this.notificationRoutingService.pickTasksRouteTarget({
        bedIds,
        plantingIds,
      });

      const batchDedupeKey =
        userIntentKey ??
        `${events[0].user.id}:${type}:${routeTarget}:${new Date().toISOString().slice(0, 13)}`;

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
          userIntentKey,
        },
        dedupeKey: batchDedupeKey,
        userIntentKey,
        priority: events.some(
          (event) => event.priority === NotificationPriority.HIGH,
        )
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL,
        deliveryPolicy,
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
      const userIntentKey = events[0].userIntentKey ?? null;
      return {
        type,
        routeTarget: NotificationRouteTarget.PLANNER,
        title: copy.title,
        body: copy.body,
        payload: { actionTaskIds: uniqIds },
        dedupeKey: `${events[0].user.id}:${type}:${day}`,
        userIntentKey,
        priority: NotificationPriority.NORMAL,
        deliveryPolicy: NotificationDeliveryPolicy.PUSH_DIGEST,
        dedupeHours: 24,
      };
    }

    if (type === NotificationType.WEATHER_STATUS_CHANGED) {
      const latestPayload = events[events.length - 1].payload;
      const weatherStatusCode = this.readString(
        latestPayload.weatherStatusCode,
      );
      const weatherStatusReason = this.readString(
        latestPayload.weatherStatusReason,
      );
      const copy =
        this.notificationCopyService.buildWeatherStatusChangedCopy(
          weatherStatusCode,
        );
      const weatherAlertCoverageKey = this.readString(
        latestPayload.weatherAlertCoverageKey,
      );
      const userIntentKey = events[events.length - 1].userIntentKey ?? null;
      return {
        type,
        routeTarget: NotificationRouteTarget.WEATHER,
        title: copy.title,
        body: copy.body,
        payload: {
          weatherStatusCode,
          weatherStatusReason,
          validFrom: this.readString(latestPayload.validFrom),
          validTo: this.readString(latestPayload.validTo),
        },
        dedupeKey:
          events[events.length - 1].dedupeKey ||
          `${events[0].user.id}:${type}:${weatherStatusCode ?? 'NA'}`,
        userIntentKey,
        priority: events[events.length - 1].priority,
        deliveryPolicy: this.resolveWeatherDeliveryPolicy(weatherStatusReason),
        dedupeHours: 4,
        suppressPushWhenDedupedBy: weatherAlertCoverageKey
          ? {
              type: NotificationType.WEATHER_ALERTS_SUMMARY,
              dedupeKey: weatherAlertCoverageKey,
            }
          : undefined,
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
      const userIntentKey = events[events.length - 1].userIntentKey ?? null;

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
        userIntentKey,
        priority: events[events.length - 1].priority,
        deliveryPolicy: this.resolveGardenRiskDeliveryPolicy(
          events[events.length - 1].priority,
        ),
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
      const userIntentKey = events[events.length - 1].userIntentKey ?? null;
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
        userIntentKey,
        priority: NotificationPriority.HIGH,
        deliveryPolicy: this.resolveWeatherDeliveryPolicy(primaryWarningReason),
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
      const articleTitle =
        events
          .map((event) => this.readString(event.payload.articleTitle))
          .find((v): v is string => Boolean(v)) ?? null;
      const copy = this.notificationCopyService.buildArticleRecommendedCopy(
        articleIds.length,
        articleTitle,
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
          articleTitle,
        },
        dedupeKey: `${events[0].user.id}:${type}:${articleIds.sort().join(',')}`,
        userIntentKey: null,
        priority: NotificationPriority.NORMAL,
        deliveryPolicy: NotificationDeliveryPolicy.PUSH_DIGEST,
        dedupeHours: 18,
      };
    }

    if (type === NotificationType.LIFECYCLE_SUGGESTION) {
      // Aggregate all plantingIds from events sharing the same userIntentKey
      const plantingIds = [
        ...new Set(
          events
            .map((event) => this.readString(event.payload.plantingId))
            .filter((v): v is string => Boolean(v)),
        ),
      ];
      const bedIds = [
        ...new Set(
          events
            .map((event) => this.readString(event.payload.bedId))
            .filter((v): v is string => Boolean(v)),
        ),
      ];
      const suggestion =
        this.readString(events[0].payload.suggestedAction) ??
        'aktualizacja cyklu';
      const count = plantingIds.length;
      const copy =
        count > 1
          ? this.notificationCopyService.buildLifecyclePluralCopy(
              count,
              suggestion,
            )
          : this.notificationCopyService.buildLifecycleSuggestionCopy(
              suggestion,
            );

      const userIntentKey = events[0].userIntentKey ?? null;

      return {
        type,
        routeTarget:
          plantingIds.length === 1
            ? NotificationRouteTarget.PLANTING_DETAIL
            : NotificationRouteTarget.BED_DETAIL,
        title: copy.title,
        body: copy.body,
        payload: {
          plantingIds,
          bedIds,
          plantingId: plantingIds[0] ?? null,
          bedId: bedIds[0] ?? null,
          suggestedAction: suggestion,
          count,
        },
        dedupeKey: events[0].dedupeKey,
        userIntentKey,
        priority: events[0].priority,
        deliveryPolicy: NotificationDeliveryPolicy.PUSH_DIGEST,
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
        userIntentKey: null,
        priority: NotificationPriority.NORMAL,
        deliveryPolicy: NotificationDeliveryPolicy.PUSH_DIGEST,
        dedupeHours: 24 * 8,
      };
    }

    return null;
  }

  /**
   * Resolves the delivery policy for TASKS_GENERATED events based on intent.
   *
   * WATERING_TODAY / HARVEST_READY → PUSH_DIGEST (important + actionable)
   * FROST_PROTECTION / WIND_PROTECTION → PUSH_IMMEDIATE
   * WEATHER_TASKS / TASKS_DUE_TODAY → PLAN_ONLY (automation tasks, no user push)
   */
  private resolveTasksDeliveryPolicy(
    userIntentKey: string | null | undefined,
  ): NotificationDeliveryPolicy {
    if (!userIntentKey) {
      return NotificationDeliveryPolicy.PLAN_ONLY;
    }
    if (
      userIntentKey.startsWith('WATERING_TODAY:') ||
      userIntentKey.startsWith('HARVEST_READY:')
    ) {
      return NotificationDeliveryPolicy.PUSH_DIGEST;
    }
    if (
      userIntentKey.startsWith('FROST_PROTECTION:') ||
      userIntentKey.startsWith('WIND_PROTECTION:')
    ) {
      return NotificationDeliveryPolicy.PUSH_IMMEDIATE;
    }
    // TASKS_DUE_TODAY, WEATHER_TASKS, and any other automation → plan only
    return NotificationDeliveryPolicy.PLAN_ONLY;
  }

  /**
   * Resolves delivery policy for weather events based on the reason code.
   * FROST / HARD_FROST / WIND_DAMAGE / STORM → PUSH_IMMEDIATE
   * DROUGHT / HEAVY_RAIN → PUSH_DIGEST
   */
  private resolveWeatherDeliveryPolicy(
    reason: string | null | undefined,
  ): NotificationDeliveryPolicy {
    if (!reason) return NotificationDeliveryPolicy.PUSH_DIGEST;
    const code = reason.toUpperCase();
    if (
      code.includes('FROST') ||
      code.includes('WIND_DAMAGE') ||
      code.includes('STORM')
    ) {
      return NotificationDeliveryPolicy.PUSH_IMMEDIATE;
    }
    return NotificationDeliveryPolicy.PUSH_DIGEST;
  }

  /**
   * Garden risk: HIGH/CRITICAL priority → PUSH_IMMEDIATE, else PUSH_DIGEST
   */
  private resolveGardenRiskDeliveryPolicy(
    priority: NotificationPriority,
  ): NotificationDeliveryPolicy {
    if (
      priority === NotificationPriority.HIGH ||
      priority === NotificationPriority.CRITICAL
    ) {
      return NotificationDeliveryPolicy.PUSH_IMMEDIATE;
    }
    return NotificationDeliveryPolicy.PUSH_DIGEST;
  }

  /**
   * Builds intent-specific copy for TASKS_GENERATED batches.
   * Falls back to generic "N nowych zadań" when intent is unknown.
   */
  private buildTasksIntentCopy(
    userIntentKey: string | null | undefined,
    bedCount: number,
    plantingCount: number,
    taskCount: number,
  ): { title: string; body: string } {
    if (userIntentKey?.startsWith('WATERING_TODAY:')) {
      return this.notificationCopyService.buildWateringTasksCopy(
        bedCount || taskCount,
      );
    }
    if (userIntentKey?.startsWith('HARVEST_READY:')) {
      return this.notificationCopyService.buildHarvestReadyCopy(
        plantingCount || taskCount,
      );
    }
    if (userIntentKey?.startsWith('FROST_PROTECTION:')) {
      return this.notificationCopyService.buildFrostProtectionCopy(taskCount);
    }
    if (userIntentKey?.startsWith('WIND_PROTECTION:')) {
      return this.notificationCopyService.buildWindProtectionCopy(taskCount);
    }
    // Generic fallback for TASKS_DUE_TODAY and WEATHER_TASKS
    return this.notificationCopyService.buildTasksGeneratedCopy(taskCount);
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

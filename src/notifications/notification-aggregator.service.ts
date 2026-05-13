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

type BatchCandidate = {
  type: NotificationType;
  routeTarget: NotificationRouteTarget;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  priority: NotificationPriority;
  dedupeHours: number;
};

@Injectable()
export class NotificationAggregatorService {
  private readonly logger = new Logger(NotificationAggregatorService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notificationRoutingService: NotificationRoutingService,
    private readonly notificationPolicyService: NotificationPolicyService,
    private readonly notificationCenterService: NotificationCenterService,
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

      return {
        type,
        routeTarget,
        title: 'Nowe zadania w ogrodzie',
        body: `Dodano ${actionTaskIds.length} nowych zadań.`,
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
      return {
        type,
        routeTarget: NotificationRouteTarget.PLANNER,
        title: 'Plan na dziś',
        body: `Na dziś masz ${uniqIds.length} zadań do wykonania.`,
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
      return {
        type,
        routeTarget: NotificationRouteTarget.WEATHER,
        title: 'Zmiana pogody',
        body: `Nowy status pogody: ${weatherStatusCode ?? 'aktualizacja'}.`,
        payload: { weatherStatusCode },
        dedupeKey: `${events[0].user.id}:${type}:${weatherStatusCode ?? 'NA'}`,
        priority: events[events.length - 1].priority,
        dedupeHours: 4,
      };
    }

    if (type === NotificationType.GARDEN_RISK_CHANGED) {
      const gardenRiskCode = this.readString(
        events[events.length - 1].payload.gardenRiskCode,
      );
      return {
        type,
        routeTarget: NotificationRouteTarget.GARDEN_RISK,
        title: 'Zmiana ryzyka ogrodu',
        body: `Poziom ryzyka: ${gardenRiskCode ?? 'aktualizacja'}.`,
        payload: { gardenRiskCode },
        dedupeKey: `${events[0].user.id}:${type}:${gardenRiskCode ?? 'NA'}`,
        priority: events[events.length - 1].priority,
        dedupeHours: 6,
      };
    }

    if (type === NotificationType.WEATHER_ALERTS_SUMMARY) {
      const warningIds = events.flatMap((item) =>
        this.readStringArray(item.payload.warningIds),
      );
      const recomputeKey = this.readString(
        events[events.length - 1].payload.recomputeKey,
      );
      return {
        type,
        routeTarget: NotificationRouteTarget.WEATHER_ALERTS,
        title: 'Alerty pogodowe',
        body: `Wykryto ${warningIds.length} istotnych alertów pogodowych.`,
        payload: { warningIds: [...new Set(warningIds)] },
        dedupeKey: `${events[0].user.id}:${type}:${recomputeKey ?? 'now'}`,
        priority: NotificationPriority.HIGH,
        dedupeHours: 6,
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

      return {
        type,
        routeTarget,
        title:
          articleIds.length === 1
            ? 'Nowy artykuł dla Twoich upraw'
            : 'Nowe artykuły dla Twoich upraw',
        body:
          articleIds.length === 1
            ? 'Pojawił się nowy artykuł dopasowany do Twojego ogrodu.'
            : `Pojawiło się ${articleIds.length} nowych artykułów dopasowanych do Twojego ogrodu.`,
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
      return {
        type,
        routeTarget: this.readString(events[0].payload.plantingId)
          ? NotificationRouteTarget.PLANTING_DETAIL
          : NotificationRouteTarget.BED_DETAIL,
        title: 'Sugestia lifecycle',
        body: suggestion,
        payload: events[0].payload,
        dedupeKey: events[0].dedupeKey,
        priority: events[0].priority,
        dedupeHours: 24 * 14,
      };
    }

    if (type === NotificationType.WEEKLY_DIGEST) {
      return {
        type,
        routeTarget: NotificationRouteTarget.NOTIFICATION_CENTER,
        title: 'Tygodniowe podsumowanie ogrodu',
        body: 'Sprawdź podsumowanie z ostatnich 7 dni.',
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

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  NotificationEventStatus,
  NotificationPriority,
  NotificationType,
} from '../common/enums/notification.enums';
import { NotificationEventOutbox } from './entities/notification-event-outbox.entity';
import { User } from '../users/user.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import {
  ActionTaskSource,
  ActionTaskStatus,
} from '../common/enums/action.enums';
import { WarningInstance } from '../weather/warnings/warning-instance.entity';
import { NotificationCopyService } from './notification-copy.service';

type PublishEventParams = {
  userId: string;
  type: NotificationType;
  source: string;
  sourceId?: string | null;
  payload: Record<string, unknown>;
  dedupeKey: string;
  userIntentKey?: string | null;
  priority: NotificationPriority;
  availableAt?: Date;
};

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notificationCopyService: NotificationCopyService,
  ) {}

  async publishEvent(params: PublishEventParams): Promise<void> {
    const user = await this.em.findOne(User, { id: params.userId });
    if (!user) {
      return;
    }

    const exists = await this.em.findOne(NotificationEventOutbox, {
      user: user.id,
      type: params.type,
      dedupeKey: params.dedupeKey,
      status: {
        $in: [
          NotificationEventStatus.PENDING,
          NotificationEventStatus.PROCESSED,
        ],
      },
    });

    if (exists) {
      return;
    }

    const event = new NotificationEventOutbox();
    event.user = user;
    event.type = params.type;
    event.source = params.source;
    event.sourceId = params.sourceId ?? null;
    event.payload = params.payload;
    event.dedupeKey = params.dedupeKey;
    event.userIntentKey = params.userIntentKey ?? null;
    event.priority = params.priority;
    event.availableAt = params.availableAt ?? new Date();

    this.em.persist(event);
    await this.em.flush();
  }

  /**
   * Resolves a userIntentKey for a task-based notification.
   *
   * The intent key groups notifications by what the user needs to do,
   * not by which specific task/bed/planting triggered the event.
   *
   * Examples:
   *   WATERING_TODAY:{userId}:{date}     — all watering tasks due today
   *   FROST_PROTECTION:{userId}:{date}   — all frost-related weather tasks
   *   TASKS_DUE_TODAY:{userId}:{date}    — generic automation tasks
   */
  resolveTaskUserIntentKey(userId: string, task: ActionTask): string {
    const today = new Date().toISOString().slice(0, 10);

    if (task.source === ActionTaskSource.WEATHER_WARNING) {
      // Derive intent from the action template slug or title
      const slug =
        (task.actionTemplate as { slug?: string } | undefined)?.slug ??
        task.title ??
        '';
      const code = slug.toUpperCase();

      if (
        code.includes('WODA') ||
        code.includes('WATER') ||
        code.includes('PODLEW') ||
        code.includes('PODLEJ')
      ) {
        return `WATERING_TODAY:${userId}:${today}`;
      }
      if (code.includes('ZBIOR') || code.includes('HARVEST')) {
        return `HARVEST_READY:${userId}:${today}`;
      }
      if (
        code.includes('FROST') ||
        code.includes('PRZYMROZ') ||
        code.includes('OSLON')
      ) {
        return `FROST_PROTECTION:${userId}:${today}`;
      }
      if (code.includes('WIND') || code.includes('WIATR')) {
        return `WIND_PROTECTION:${userId}:${today}`;
      }
      // All other weather tasks share one daily weather-tasks intent
      return `WEATHER_TASKS:${userId}:${today}`;
    }

    if (task.source === ActionTaskSource.VEGETABLE_RULE) {
      // Automation tasks go into a single daily plan intent
      return `TASKS_DUE_TODAY:${userId}:${today}`;
    }

    return `TASKS_DUE_TODAY:${userId}:${today}`;
  }

  async publishTaskEvents(params: {
    userId: string;
    tasks: ActionTask[];
    source: string;
  }): Promise<void> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const dueTasks = params.tasks.filter(
      (task) =>
        task.status === ActionTaskStatus.PENDING &&
        task.dueAt != null &&
        task.dueAt.getTime() >= startOfToday.getTime(),
    );

    for (const task of dueTasks) {
      const userIntentKey = this.resolveTaskUserIntentKey(params.userId, task);

      // dedupeKey uses intent+date so all tasks with the same intent share one outbox event
      const dedupeKey = [
        params.userId,
        NotificationType.TASKS_GENERATED,
        userIntentKey,
        task.id,
      ].join(':');

      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.TASKS_GENERATED,
        source: params.source,
        sourceId: task.id,
        payload: {
          taskId: task.id,
          bedId: task.bed?.id ?? null,
          plantingId: task.planting?.id ?? null,
          dueAt: task.dueAt?.toISOString() ?? null,
          source: task.source,
          userIntentKey,
        },
        dedupeKey,
        userIntentKey,
        priority:
          task.source === ActionTaskSource.WEATHER_WARNING
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
      });
    }
  }

  async publishWeatherEvents(params: {
    userId: string;
    recomputeKey: string;
    weatherStatusCode: string;
    weatherStatusPriority: NotificationPriority;
    weatherChanged: boolean;
    gardenRiskCode: string;
    gardenRiskPriority: NotificationPriority;
    gardenRiskIncreased: boolean;
    warningInstances: WarningInstance[];
  }): Promise<void> {
    const importantWarnings = params.warningInstances.filter((warning) => {
      const code = `${warning.code}`;
      return (
        code.includes('FROST') ||
        code.includes('HARD_FROST') ||
        code.includes('HEAVY_RAIN') ||
        code.includes('DROUGHT') ||
        code.includes('WIND_DAMAGE') ||
        code.includes('STORM')
      );
    });

    const importantWarningReasons = [
      ...new Set(
        importantWarnings
          .map((warning) =>
            this.notificationCopyService.normalizeWarningReason(
              `${warning.code}`,
            ),
          )
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort();

    const windowStart = this.floorToHourIso(
      this.minDate(importantWarnings.map((item) => item.validFrom)),
    );
    const windowEnd = this.floorToHourIso(
      this.maxDate(importantWarnings.map((item) => item.validTo)),
    );
    const alertReasonSignature = importantWarningReasons.join('|') || 'GENERIC';
    const today = new Date().toISOString().slice(0, 10);
    const weatherAlertsDedupeKey = `${params.userId}:WEATHER_ALERTS_SUMMARY:${alertReasonSignature}:${today}`;

    if (params.weatherChanged) {
      const statusCodeUpper = params.weatherStatusCode.toUpperCase();
      const weatherStatusReason =
        statusCodeUpper.includes('HEAVY_RAIN') ||
        statusCodeUpper.includes('RAIN')
          ? 'HEAVY_RAIN'
          : statusCodeUpper.includes('WIND')
            ? 'WIND_DAMAGE'
            : statusCodeUpper.includes('HARD_FROST')
              ? 'HARD_FROST'
              : statusCodeUpper.includes('FROST')
                ? 'FROST'
                : statusCodeUpper.includes('THUNDER') ||
                    statusCodeUpper.includes('STORM')
                  ? 'STORM'
                  : statusCodeUpper.includes('DROUGHT') ||
                      statusCodeUpper.includes('DRY') ||
                      statusCodeUpper.includes('WATERING')
                    ? 'DROUGHT'
                    : (this.notificationCopyService.normalizeWarningReason(
                        params.weatherStatusCode,
                      ) ?? params.weatherStatusCode);

      const fallbackWindow = this.floorToHourIso(new Date(params.recomputeKey));
      const weatherValidFrom =
        importantWarnings.length > 0 ? windowStart : fallbackWindow;
      const weatherValidTo =
        importantWarnings.length > 0 ? windowEnd : fallbackWindow;

      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.WEATHER_STATUS_CHANGED,
        source: 'weather-recompute',
        sourceId: null,
        dedupeKey: `${params.userId}:WEATHER_STATUS_CHANGED:${weatherStatusReason}:${today}`,
        userIntentKey: `WEATHER_ALERTS:${params.userId}:${today}:${weatherStatusReason}`,
        priority: params.weatherStatusPriority,
        payload: {
          weatherStatusCode: params.weatherStatusCode,
          weatherStatusReason,
          validFrom: weatherValidFrom,
          validTo: weatherValidTo,
          weatherAlertCoverageKey: importantWarningReasons.includes(
            weatherStatusReason,
          )
            ? weatherAlertsDedupeKey
            : null,
        },
      });
    }

    if (importantWarnings.length > 0) {
      const primaryReason = importantWarningReasons[0] ?? 'GENERIC';
      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.WEATHER_ALERTS_SUMMARY,
        source: 'weather-recompute',
        dedupeKey: weatherAlertsDedupeKey,
        userIntentKey: `WEATHER_ALERTS:${params.userId}:${today}:${primaryReason}`,
        priority: NotificationPriority.HIGH,
        payload: {
          warningIds: importantWarnings.map((item) => item.id),
          warningCodes: importantWarnings.map((item) => item.code),
          warningReasons: importantWarningReasons,
          primaryWarningReason: importantWarningReasons[0] ?? null,
          validFrom: windowStart,
          validTo: windowEnd,
          recomputeKey: params.recomputeKey,
        },
      });
    }

    if (params.gardenRiskIncreased) {
      const riskReason =
        this.notificationCopyService.normalizeWarningReason(
          params.gardenRiskCode,
        ) ?? params.gardenRiskCode;

      const riskLevel = this.notificationCopyService.mapPriorityToRiskLevel(
        params.gardenRiskPriority,
      );

      const warningCodes = params.warningInstances
        .map((item) => `${item.code}`)
        .filter(
          (code) =>
            this.notificationCopyService.normalizeWarningReason(code) ===
            riskReason,
        );

      const relevantWarnings = params.warningInstances.filter(
        (item) =>
          this.notificationCopyService.normalizeWarningReason(
            `${item.code}`,
          ) === riskReason,
      );

      const riskValidFrom = this.floorToHourIso(
        this.minDate(relevantWarnings.map((item) => item.validFrom)),
      );
      const riskValidTo = this.floorToHourIso(
        this.maxDate(relevantWarnings.map((item) => item.validTo)),
      );

      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.GARDEN_RISK_CHANGED,
        source: 'weather-recompute',
        sourceId: null,
        dedupeKey: `${params.userId}:GARDEN_RISK_CHANGED:${riskReason}:${today}`,
        userIntentKey: `GARDEN_RISK_${riskReason}:${params.userId}:${today}`,
        priority: params.gardenRiskPriority,
        payload: {
          riskLevel,
          riskReason,
          warningCode: riskReason,
          warningCodes,
          gardenRiskCode: params.gardenRiskCode,
          validFrom: riskValidFrom,
          validTo: riskValidTo,
          weatherAlertCoverageKey: importantWarningReasons.includes(riskReason)
            ? weatherAlertsDedupeKey
            : null,
        },
      });
    }
  }

  private minDate(values: Date[]): Date {
    if (values.length === 0) {
      return new Date();
    }

    return values.reduce((acc, value) => (value < acc ? value : acc));
  }

  private maxDate(values: Date[]): Date {
    if (values.length === 0) {
      return new Date();
    }

    return values.reduce((acc, value) => (value > acc ? value : acc));
  }

  private floorToHourIso(value: Date): string {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        value.getUTCHours(),
        0,
        0,
        0,
      ),
    ).toISOString();
  }

  async publishArticleEvent(params: {
    userIds: string[];
    articleId: string;
    articleSlug: string;
    articleTitle?: string;
  }): Promise<void> {
    for (const userId of params.userIds) {
      await this.publishEvent({
        userId,
        type: NotificationType.ARTICLE_RECOMMENDED,
        source: 'articles',
        sourceId: params.articleId,
        dedupeKey: `${userId}:ARTICLE_RECOMMENDED:${params.articleId}`,
        priority: NotificationPriority.NORMAL,
        payload: {
          articleId: params.articleId,
          articleSlug: params.articleSlug,
          articleTitle: params.articleTitle ?? null,
        },
      });
    }
  }

  /**
   * Publishes a lifecycle suggestion event. Called once per planting.
   * The dedupeKey is per (userId, suggestedAction, today) so multiple
   * plantings with the same action type on the same day produce only one event.
   *
   * The Aggregator accumulates all plantingIds from concurrent events that
   * share the same userIntentKey and builds a single merged batch.
   */
  async publishLifecycleSuggestionEvent(params: {
    userId: string;
    plantingId: string;
    bedId?: string | null;
    suggestedAction: string;
    priority?: NotificationPriority;
  }): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const intentSlug = params.suggestedAction.slice(0, 40).replace(/\s+/g, '_');
    const userIntentKey = `LIFECYCLE_${intentSlug}:${params.userId}:${today}`;

    await this.publishEvent({
      userId: params.userId,
      type: NotificationType.LIFECYCLE_SUGGESTION,
      source: 'lifecycle',
      sourceId: params.plantingId,
      dedupeKey: `${params.userId}:LIFECYCLE_SUGGESTION:${params.suggestedAction}:${today}`,
      userIntentKey,
      priority: params.priority ?? NotificationPriority.NORMAL,
      payload: {
        plantingId: params.plantingId,
        bedId: params.bedId ?? null,
        suggestedAction: params.suggestedAction,
      },
    });
  }

  async publishDailySummaryEvent(
    userId: string,
    taskIds: string[],
  ): Promise<void> {
    if (taskIds.length === 0) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    await this.publishEvent({
      userId,
      type: NotificationType.DAILY_TASKS_SUMMARY,
      source: 'daily-summary-cron',
      dedupeKey: `${userId}:DAILY_TASKS_SUMMARY:${today}`,
      userIntentKey: `TASKS_DUE_TODAY:${userId}:${today}`,
      priority: NotificationPriority.NORMAL,
      payload: {
        actionTaskIds: taskIds,
      },
    });
  }

  async publishWeeklyDigestEvent(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await this.publishEvent({
      userId,
      type: NotificationType.WEEKLY_DIGEST,
      source: 'weekly-digest-cron',
      dedupeKey: `${userId}:WEEKLY_DIGEST:${today}`,
      priority: NotificationPriority.NORMAL,
      payload,
    });
  }

  @Cron('*/5 * * * *', { name: 'notification-automation-task-events' })
  async collectAutomationTaskEvents(): Promise<void> {
    const from = new Date(Date.now() - 15 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const tasks = await this.em.find(
      ActionTask,
      {
        source: { $in: [ActionTaskSource.VEGETABLE_RULE] },
        status: ActionTaskStatus.PENDING,
        createdAt: { $gte: from },
        dueAt: { $gte: startOfToday },
      },
      {
        populate: ['user', 'bed', 'planting', 'actionTemplate'],
      },
    );

    const byUser = new Map<string, ActionTask[]>();
    for (const task of tasks) {
      const userId = task.user.id;
      const current = byUser.get(userId) ?? [];
      current.push(task);
      byUser.set(userId, current);
    }

    for (const [userId, userTasks] of byUser.entries()) {
      await this.publishTaskEvents({
        userId,
        tasks: userTasks,
        source: 'action-automation',
      });
    }

    if (tasks.length > 0) {
      this.logger.log(`collected automation task events count=${tasks.length}`);
    }

    this.em.clear();
  }
}

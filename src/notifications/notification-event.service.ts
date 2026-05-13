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

type PublishEventParams = {
  userId: string;
  type: NotificationType;
  source: string;
  sourceId?: string | null;
  payload: Record<string, unknown>;
  dedupeKey: string;
  priority: NotificationPriority;
  availableAt?: Date;
};

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(private readonly em: EntityManager) {}

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
    event.priority = params.priority;
    event.availableAt = params.availableAt ?? new Date();

    this.em.persist(event);
    await this.em.flush();
  }

  async publishTaskEvents(params: {
    userId: string;
    tasks: ActionTask[];
    source: string;
  }): Promise<void> {
    const dueTasks = params.tasks.filter(
      (task) =>
        task.status === ActionTaskStatus.PENDING &&
        task.dueAt != null &&
        task.dueAt.getTime() >= Date.now(),
    );

    for (const task of dueTasks) {
      const dueWindow = `${task.dueAt?.toISOString().slice(0, 13) ?? 'na'}:00`;
      const dedupeKey = [
        params.userId,
        NotificationType.TASKS_GENERATED,
        task.id,
        dueWindow,
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
        },
        dedupeKey,
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
    if (params.weatherChanged) {
      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.WEATHER_STATUS_CHANGED,
        source: 'weather-recompute',
        sourceId: null,
        dedupeKey: `${params.userId}:WEATHER_STATUS_CHANGED:${params.weatherStatusCode}`,
        priority: params.weatherStatusPriority,
        payload: {
          weatherStatusCode: params.weatherStatusCode,
        },
      });
    }

    if (params.gardenRiskIncreased) {
      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.GARDEN_RISK_CHANGED,
        source: 'weather-recompute',
        sourceId: null,
        dedupeKey: `${params.userId}:GARDEN_RISK_CHANGED:${params.gardenRiskCode}`,
        priority: params.gardenRiskPriority,
        payload: {
          gardenRiskCode: params.gardenRiskCode,
        },
      });
    }

    const importantWarnings = params.warningInstances.filter((warning) => {
      const code = `${warning.code}`;
      return (
        code.includes('FROST') ||
        code.includes('HARD_FROST') ||
        code.includes('HEAVY_RAIN') ||
        code.includes('DROUGHT') ||
        code.includes('STORM')
      );
    });

    if (importantWarnings.length > 0) {
      await this.publishEvent({
        userId: params.userId,
        type: NotificationType.WEATHER_ALERTS_SUMMARY,
        source: 'weather-recompute',
        dedupeKey: `${params.userId}:WEATHER_ALERTS_SUMMARY:${params.recomputeKey}`,
        priority: NotificationPriority.HIGH,
        payload: {
          warningIds: importantWarnings.map((item) => item.id),
          warningCodes: importantWarnings.map((item) => item.code),
          recomputeKey: params.recomputeKey,
        },
      });
    }
  }

  async publishArticleEvent(params: {
    userIds: string[];
    articleId: string;
    articleSlug: string;
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
        },
      });
    }
  }

  async publishLifecycleSuggestionEvent(params: {
    userId: string;
    plantingId: string;
    bedId?: string | null;
    suggestedAction: string;
    priority?: NotificationPriority;
  }): Promise<void> {
    await this.publishEvent({
      userId: params.userId,
      type: NotificationType.LIFECYCLE_SUGGESTION,
      source: 'lifecycle',
      sourceId: params.plantingId,
      dedupeKey: `${params.userId}:LIFECYCLE_SUGGESTION:${params.plantingId}:${params.suggestedAction}`,
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

    const tasks = await this.em.find(
      ActionTask,
      {
        source: { $in: [ActionTaskSource.VEGETABLE_RULE] },
        status: ActionTaskStatus.PENDING,
        createdAt: { $gte: from },
        dueAt: { $gte: new Date() },
      },
      {
        populate: ['user', 'bed', 'planting'],
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
  }
}

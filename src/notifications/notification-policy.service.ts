import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  NotificationPriority,
  NotificationType,
} from '../common/enums/notification.enums';
import { User } from '../users/user.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationDedupe } from './entities/notification-dedupe.entity';
import { NotificationPreferencesService } from './notification-preferences.service';

type NotificationPolicyDecision = {
  decision: 'PUSH' | 'CENTER_ONLY' | 'SKIP';
  reason: string;
};

@Injectable()
export class NotificationPolicyService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  async evaluate(params: {
    user: User;
    type: NotificationType;
    priority: NotificationPriority;
    dedupeKey: string;
    dedupeHours: number;
    userIntentKey?: string | null;
    suppressPushWhenDedupedBy?: {
      type: NotificationType;
      dedupeKey: string;
    };
  }): Promise<NotificationPolicyDecision> {
    const {
      user,
      type,
      dedupeKey,
      dedupeHours,
      userIntentKey,
      suppressPushWhenDedupedBy,
    } = params;

    if (!user.notificationsEnabled) {
      return { decision: 'SKIP', reason: 'preference_disabled' };
    }

    const preference =
      await this.notificationPreferencesService.getOrCreatePreference(user);

    if (!this.isTypeEnabled(type, preference)) {
      return { decision: 'SKIP', reason: 'type_disabled' };
    }

    const dedupeExists = await this.em.findOne(NotificationDedupe, {
      user: user.id,
      type,
      dedupeKey,
      expiresAt: { $gt: new Date() },
    });

    if (dedupeExists) {
      return { decision: 'SKIP', reason: 'deduped' };
    }

    // Secondary dedup: if a batch for this userIntentKey was already sent today
    // (regardless of dedupeKey format), skip. This prevents duplicate pushes
    // when the dedupeKey format changed between deployments (e.g. timestamp-based
    // old format vs date-only new format for the same logical intent).
    if (userIntentKey) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const intentBatchExists = await this.em.getConnection().execute(
        `SELECT 1 FROM notification_batches
         WHERE user_id = ? AND user_intent_key = ?
           AND status IN ('PENDING','SENT','SKIPPED')
           AND created_at >= ?
         LIMIT 1`,
        [user.id, userIntentKey, todayStart],
      );
      if (intentBatchExists.length > 0) {
        return { decision: 'SKIP', reason: 'intent_deduped_today' };
      }
    }

    if (suppressPushWhenDedupedBy) {
      const coveredByOtherNotification = await this.em.findOne(
        NotificationDedupe,
        {
          user: user.id,
          type: suppressPushWhenDedupedBy.type,
          dedupeKey: suppressPushWhenDedupedBy.dedupeKey,
          expiresAt: { $gt: new Date() },
        },
      );

      if (coveredByOtherNotification) {
        await this.insertDedupeRecord(user, type, dedupeKey, dedupeHours);

        return {
          decision: 'CENTER_ONLY',
          reason: 'covered_by_weather_alert',
        };
      }
    }

    await this.insertDedupeRecord(user, type, dedupeKey, dedupeHours);

    return { decision: 'PUSH', reason: 'ok' };
  }

  private async insertDedupeRecord(
    user: User,
    type: NotificationType,
    dedupeKey: string,
    dedupeHours: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + dedupeHours * 60 * 60 * 1000);
    await this.em.getConnection().execute(
      `insert into notification_dedupe (user_id, type, dedupe_key, expires_at, created_at)
       values (?, ?, ?, ?, now())
       on conflict (user_id, type, dedupe_key) do nothing`,
      [user.id, type, dedupeKey, expiresAt],
    );
  }

  private isTypeEnabled(
    type: NotificationType,
    preference: NotificationPreference,
  ): boolean {
    switch (type) {
      case NotificationType.TASKS_GENERATED:
        return preference.tasksEnabled;
      case NotificationType.DAILY_TASKS_SUMMARY:
        return preference.dailySummaryEnabled;
      case NotificationType.WEATHER_STATUS_CHANGED:
        return preference.weatherStatusEnabled;
      case NotificationType.GARDEN_RISK_CHANGED:
        return preference.gardenRiskEnabled;
      case NotificationType.WEATHER_ALERTS_SUMMARY:
        return preference.weatherAlertsEnabled;
      case NotificationType.ARTICLE_RECOMMENDED:
        return preference.recommendedArticlesEnabled;
      case NotificationType.LIFECYCLE_SUGGESTION:
        return preference.lifecycleSuggestionsEnabled;
      case NotificationType.WEEKLY_DIGEST:
        return preference.weeklyDigestEnabled;
      default:
        return true;
    }
  }
}

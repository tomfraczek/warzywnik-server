import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';
import { NotificationEventService } from './notification-event.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class DailySummaryService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationEventService: NotificationEventService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Cron('0 * * * *', { name: 'notification-daily-summary' })
  async runDailySummary(): Promise<void> {
    const users = await this.em.find(User, {
      isActive: true,
      notificationsEnabled: true,
    });

    for (const user of users) {
      const preference =
        await this.notificationPreferencesService.getOrCreatePreference(user);

      if (!preference.dailySummaryEnabled) {
        continue;
      }

      if (!this.isMatchingHour(user.timezone, preference.notificationHour)) {
        continue;
      }

      const { start, end } = this.getTodayRangeForTimezone(user.timezone);
      const tasks = await this.em.find(ActionTask, {
        user: user.id,
        status: ActionTaskStatus.PENDING,
        dueAt: {
          $gte: start,
          $lte: end,
        },
      });

      if (tasks.length === 0) {
        continue;
      }

      await this.notificationEventService.publishDailySummaryEvent(
        user.id,
        tasks.map((task) => task.id),
      );
    }
  }

  private isMatchingHour(timezone: string, notificationHour: number): boolean {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: timezone,
    }).formatToParts(new Date());

    const hourPart = parts.find((item) => item.type === 'hour')?.value ?? '0';
    return Number(hourPart) === notificationHour;
  }

  private getTodayRangeForTimezone(timezone: string): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    const datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const start = new Date(`${datePart}T00:00:00.000Z`);
    const end = new Date(`${datePart}T23:59:59.999Z`);

    return { start, end };
  }
}

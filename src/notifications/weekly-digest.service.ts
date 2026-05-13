import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import { ActionTaskStatus } from '../common/enums/action.enums';
import { WarningInstance } from '../weather/warnings/warning-instance.entity';
import { Planting } from '../plantings/planting.entity';
import { NotificationEventService } from './notification-event.service';
import { Article } from '../articles/article.entity';
import { ArticleStatus } from '../common/enums/article.enums';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PlantingStatus } from '../common/enums/planting.enums';

@Injectable()
export class WeeklyDigestService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationEventService: NotificationEventService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Cron('0 * * * *', { name: 'notification-weekly-digest' })
  async runWeeklyDigest(): Promise<void> {
    const users = await this.em.find(User, {
      isActive: true,
      notificationsEnabled: true,
    });

    for (const user of users) {
      const pref =
        await this.notificationPreferencesService.getOrCreatePreference(user);

      if (!pref.weeklyDigestEnabled) {
        continue;
      }

      if (!this.isMatchingHour(user.timezone, pref.notificationHour)) {
        continue;
      }

      if (!this.isWeeklyDay(user.timezone)) {
        continue;
      }

      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [doneTasks, newTasks, activeWarnings, nearingHarvest, newArticles] =
        await Promise.all([
          this.em.count(ActionTask, {
            user: user.id,
            status: ActionTaskStatus.DONE,
            doneAt: { $gte: from },
          }),
          this.em.count(ActionTask, {
            user: user.id,
            createdAt: { $gte: from },
          }),
          this.em.count(WarningInstance, {
            user: user.id,
            isActive: true,
            validTo: { $gt: new Date() },
          }),
          this.em.count(Planting, {
            user: user.id,
            status: {
              $in: [
                PlantingStatus.IN_GROUND,
                PlantingStatus.READY_FOR_FINAL_HARVEST,
              ],
            },
            harvestWindowStart: {
              $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          }),
          this.em.count(Article, {
            status: ArticleStatus.PUBLISHED,
            publishedAt: { $gte: from },
          }),
        ]);

      await this.notificationEventService.publishWeeklyDigestEvent(user.id, {
        doneTasks,
        newTasks,
        activeWarnings,
        nearingHarvest,
        newArticles,
      });
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

  private isWeeklyDay(timezone: string): boolean {
    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: timezone,
    }).format(new Date());

    return weekday === 'Mon';
  }
}

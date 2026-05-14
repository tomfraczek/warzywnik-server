import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../users/user.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { PatchNotificationPreferencesDto } from './dto/notification-preferences.schemas';
import { NotificationIntensity } from '../common/enums/notification.enums';
import { NotificationPreferenceResponse } from './notification.types';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly em: EntityManager) {}

  async getForUser(userId: string): Promise<NotificationPreferenceResponse> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preference = await this.getOrCreatePreference(user);

    return this.serialize(user, preference);
  }

  async patchForUser(
    userId: string,
    dto: PatchNotificationPreferencesDto,
  ): Promise<NotificationPreferenceResponse> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preference = await this.getOrCreatePreference(user);

    if (dto.notificationsEnabled !== undefined) {
      user.notificationsEnabled = dto.notificationsEnabled;
    }

    const groups = (
      dto as PatchNotificationPreferencesDto & {
        groups?: {
          tasksAndRemindersEnabled?: boolean;
          weatherAndRiskEnabled?: boolean;
          articlesAndTipsEnabled?: boolean;
          summariesEnabled?: boolean;
        };
      }
    ).groups;

    if (groups?.tasksAndRemindersEnabled !== undefined) {
      preference.tasksEnabled = groups.tasksAndRemindersEnabled;
      preference.dailySummaryEnabled = groups.tasksAndRemindersEnabled;
      preference.lifecycleSuggestionsEnabled = groups.tasksAndRemindersEnabled;
    }

    if (groups?.weatherAndRiskEnabled !== undefined) {
      preference.weatherStatusEnabled = groups.weatherAndRiskEnabled;
      preference.gardenRiskEnabled = groups.weatherAndRiskEnabled;
      preference.weatherAlertsEnabled = groups.weatherAndRiskEnabled;
    }

    if (groups?.articlesAndTipsEnabled !== undefined) {
      preference.recommendedArticlesEnabled = groups.articlesAndTipsEnabled;
    }

    if (groups?.summariesEnabled !== undefined) {
      preference.weeklyDigestEnabled = groups.summariesEnabled;
    }

    if (dto.tasksEnabled !== undefined)
      preference.tasksEnabled = dto.tasksEnabled;
    if (dto.dailySummaryEnabled !== undefined)
      preference.dailySummaryEnabled = dto.dailySummaryEnabled;
    if (dto.weatherStatusEnabled !== undefined)
      preference.weatherStatusEnabled = dto.weatherStatusEnabled;
    if (dto.gardenRiskEnabled !== undefined)
      preference.gardenRiskEnabled = dto.gardenRiskEnabled;
    if (dto.weatherAlertsEnabled !== undefined)
      preference.weatherAlertsEnabled = dto.weatherAlertsEnabled;
    if (dto.recommendedArticlesEnabled !== undefined)
      preference.recommendedArticlesEnabled = dto.recommendedArticlesEnabled;
    if (dto.lifecycleSuggestionsEnabled !== undefined)
      preference.lifecycleSuggestionsEnabled = dto.lifecycleSuggestionsEnabled;
    if (dto.weeklyDigestEnabled !== undefined)
      preference.weeklyDigestEnabled = dto.weeklyDigestEnabled;
    if (dto.intensity !== undefined) preference.intensity = dto.intensity;
    if (dto.notificationHour !== undefined) {
      preference.notificationHour = dto.notificationHour;
      user.notificationHour = dto.notificationHour;
    }

    await this.em.flush();

    return this.serialize(user, preference);
  }

  async getOrCreatePreference(user: User): Promise<NotificationPreference> {
    const existing = await this.em.findOne(NotificationPreference, {
      user: user.id,
    });

    if (existing) {
      return existing;
    }

    const preference = new NotificationPreference();
    preference.user = user;
    preference.notificationHour = user.notificationHour;
    preference.intensity = NotificationIntensity.BALANCED;

    await this.em.persistAndFlush(preference);
    return preference;
  }

  private serialize(
    user: User,
    preference: NotificationPreference,
  ): NotificationPreferenceResponse {
    const groups = {
      tasksAndRemindersEnabled:
        preference.tasksEnabled &&
        preference.dailySummaryEnabled &&
        preference.lifecycleSuggestionsEnabled,
      weatherAndRiskEnabled:
        preference.weatherStatusEnabled &&
        preference.gardenRiskEnabled &&
        preference.weatherAlertsEnabled,
      articlesAndTipsEnabled: preference.recommendedArticlesEnabled,
      summariesEnabled: preference.weeklyDigestEnabled,
    };

    return {
      notificationsEnabled: user.notificationsEnabled,
      intensity: preference.intensity,
      notificationHour: preference.notificationHour,
      groups,
      advanced: {
        tasksEnabled: preference.tasksEnabled,
        dailySummaryEnabled: preference.dailySummaryEnabled,
        weatherStatusEnabled: preference.weatherStatusEnabled,
        gardenRiskEnabled: preference.gardenRiskEnabled,
        weatherAlertsEnabled: preference.weatherAlertsEnabled,
        recommendedArticlesEnabled: preference.recommendedArticlesEnabled,
        lifecycleSuggestionsEnabled: preference.lifecycleSuggestionsEnabled,
        weeklyDigestEnabled: preference.weeklyDigestEnabled,
      },
      ui: {
        notificationsEnabled: {
          label: 'Włącz powiadomienia',
          description:
            'Otrzymuj ważne informacje o zadaniach, pogodzie i uprawach.',
        },
        groups: {
          tasksAndReminders: {
            label: 'Zadania i przypomnienia',
          },
          weatherAndRisk: {
            label: 'Pogoda i ryzyko',
          },
          articlesAndTips: {
            label: 'Porady i artykuły',
          },
          summaries: {
            label: 'Podsumowania',
          },
        },
        notificationHour: {
          label: 'Godzina codziennych przypomnień',
          description:
            'O tej godzinie wyślemy plan dnia i spokojne podsumowania. Ważne alerty pogodowe mogą przyjść od razu.',
        },
      },
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }
}

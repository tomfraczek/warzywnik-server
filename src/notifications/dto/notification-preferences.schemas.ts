import { z } from 'zod';
import { NotificationIntensity } from '../../common/enums/notification.enums';

export type PatchNotificationPreferencesDto = {
  notificationsEnabled?: boolean;
  tasksEnabled?: boolean;
  dailySummaryEnabled?: boolean;
  weatherStatusEnabled?: boolean;
  gardenRiskEnabled?: boolean;
  weatherAlertsEnabled?: boolean;
  recommendedArticlesEnabled?: boolean;
  lifecycleSuggestionsEnabled?: boolean;
  weeklyDigestEnabled?: boolean;
  intensity?: NotificationIntensity;
  notificationHour?: number;
};

export const patchNotificationPreferencesSchema = z
  .object({
    notificationsEnabled: z.coerce.boolean().optional(),
    tasksEnabled: z.coerce.boolean().optional(),
    dailySummaryEnabled: z.coerce.boolean().optional(),
    weatherStatusEnabled: z.coerce.boolean().optional(),
    gardenRiskEnabled: z.coerce.boolean().optional(),
    weatherAlertsEnabled: z.coerce.boolean().optional(),
    recommendedArticlesEnabled: z.coerce.boolean().optional(),
    lifecycleSuggestionsEnabled: z.coerce.boolean().optional(),
    weeklyDigestEnabled: z.coerce.boolean().optional(),
    intensity: z.nativeEnum(NotificationIntensity).optional(),
    notificationHour: z.coerce.number().int().min(0).max(23).optional(),
  })
  .strict();

import {
  NotificationPriority,
  NotificationRouteTarget,
  NotificationType,
} from '../common/enums/notification.enums';

export type PushNotificationPayload = {
  notificationId: string;
  type: NotificationType;
  routeTarget: NotificationRouteTarget;
  priority: NotificationPriority;
  title: string;
  body: string;
  bedId?: string;
  plantingId?: string;
  actionTaskIds?: string[];
  bedIds?: string[];
  plantingIds?: string[];
  warningIds?: string[];
  warningCode?: string;
  articleId?: string;
  articleSlug?: string;
  dedupeKey: string;
  createdAt: string;
};

export type NotificationPreferenceResponse = {
  notificationsEnabled: boolean;
  tasksEnabled: boolean;
  dailySummaryEnabled: boolean;
  weatherStatusEnabled: boolean;
  gardenRiskEnabled: boolean;
  weatherAlertsEnabled: boolean;
  recommendedArticlesEnabled: boolean;
  lifecycleSuggestionsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  intensity: string;
  notificationHour: number;
  createdAt: Date;
  updatedAt: Date;
};

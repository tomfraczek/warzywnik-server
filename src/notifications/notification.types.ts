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
  riskLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReason?: string;
  articleId?: string;
  articleSlug?: string;
  dedupeKey: string;
  createdAt: string;
};

export type NotificationPreferenceResponse = {
  notificationsEnabled: boolean;
  notificationHour: number;
  groups: {
    tasksAndRemindersEnabled: boolean;
    weatherAndRiskEnabled: boolean;
    articlesAndTipsEnabled: boolean;
    summariesEnabled: boolean;
  };
  advanced?: {
    tasksEnabled: boolean;
    dailySummaryEnabled: boolean;
    weatherStatusEnabled: boolean;
    gardenRiskEnabled: boolean;
    weatherAlertsEnabled: boolean;
    recommendedArticlesEnabled: boolean;
    lifecycleSuggestionsEnabled: boolean;
    weeklyDigestEnabled: boolean;
  };
  ui: {
    notificationsEnabled: {
      label: string;
      description: string;
    };
    groups: {
      tasksAndReminders: {
        label: string;
      };
      weatherAndRisk: {
        label: string;
      };
      articlesAndTips: {
        label: string;
      };
      summaries: {
        label: string;
      };
    };
    notificationHour: {
      label: string;
      description: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationSummaryResponse = {
  unreadCount: number;
  hasUnread: boolean;
  highestUnreadPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | null;
  hasHighPriorityUnread: boolean;
  hasCriticalUnread: boolean;
};

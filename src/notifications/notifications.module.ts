import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationEventOutbox } from './entities/notification-event-outbox.entity';
import { NotificationBatch } from './entities/notification-batch.entity';
import { Notification } from './entities/notification.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationDedupe } from './entities/notification-dedupe.entity';
import { WeatherNotificationState } from './entities/weather-notification-state.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationEventService } from './notification-event.service';
import { NotificationAggregatorService } from './notification-aggregator.service';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationRoutingService } from './notification-routing.service';
import { NotificationCenterService } from './notification-center.service';
import { PushDeliveryService } from './push-delivery.service';
import { WeeklyDigestService } from './weekly-digest.service';
import { LifecycleSuggestionService } from './lifecycle-suggestion.service';
import { DailySummaryService } from './daily-summary.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationCopyService } from './notification-copy.service';
import { User } from '../users/user.entity';
import { ActionTask } from '../action-tasks/action-task.entity';
import { WarningInstance } from '../weather/warnings/warning-instance.entity';
import { Planting } from '../plantings/planting.entity';
import { Article } from '../articles/article.entity';
import { UserDevice } from '../devices/user-device.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      NotificationPreference,
      NotificationEventOutbox,
      NotificationBatch,
      Notification,
      NotificationDelivery,
      NotificationDedupe,
      WeatherNotificationState,
      User,
      ActionTask,
      WarningInstance,
      Planting,
      Article,
      UserDevice,
    ]),
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationEventService,
    NotificationAggregatorService,
    NotificationPolicyService,
    NotificationRoutingService,
    NotificationCenterService,
    PushDeliveryService,
    WeeklyDigestService,
    LifecycleSuggestionService,
    DailySummaryService,
    NotificationPreferencesService,
    NotificationCopyService,
  ],
  exports: [
    NotificationEventService,
    NotificationCenterService,
    NotificationPreferencesService,
  ],
})
export class NotificationsModule {}

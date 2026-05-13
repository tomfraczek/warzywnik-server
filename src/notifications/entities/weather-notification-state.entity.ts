import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../../users/user.entity';
import { NotificationPriority } from '../../common/enums/notification.enums';

@Entity({ tableName: 'weather_notification_state' })
@Unique({ properties: ['user'] })
@Index({ properties: ['lastComputedAt'] })
export class WeatherNotificationState {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ length: 64, nullable: true })
  lastWeatherStatus?: string | null;

  @Enum({ items: () => NotificationPriority, nullable: true })
  lastWeatherStatusSeverity?: NotificationPriority | null;

  @Property({ length: 64, nullable: true })
  lastGardenRiskStatus?: string | null;

  @Enum({ items: () => NotificationPriority, nullable: true })
  lastGardenRiskSeverity?: NotificationPriority | null;

  @Property({ type: Date, nullable: true })
  lastComputedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

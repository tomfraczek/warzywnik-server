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
import { NotificationIntensity } from '../../common/enums/notification.enums';

@Entity({ tableName: 'notification_preferences' })
@Index({ properties: ['user'] })
@Unique({ properties: ['user'] })
export class NotificationPreference {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ type: 'boolean', default: true })
  tasksEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  dailySummaryEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  weatherStatusEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  gardenRiskEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  weatherAlertsEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  recommendedArticlesEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  lifecycleSuggestionsEnabled: boolean = true;

  @Property({ type: 'boolean', default: true })
  weeklyDigestEnabled: boolean = true;

  /**
   * @deprecated Intensity is no longer used in notification policy decisions.
   * The field is retained in the database for backward compatibility only.
   * Do not read or write this field in application logic.
   */
  @Enum({
    items: () => NotificationIntensity,
    default: NotificationIntensity.BALANCED,
  })
  intensity: NotificationIntensity = NotificationIntensity.BALANCED;

  @Property({ type: 'int', default: 9 })
  notificationHour: number = 9;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

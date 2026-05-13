import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { User } from '../../users/user.entity';
import {
  NotificationPriority,
  NotificationRouteTarget,
  NotificationType,
} from '../../common/enums/notification.enums';

@Entity({ tableName: 'notifications' })
@Index({ properties: ['user', 'createdAt'] })
@Index({ properties: ['user', 'readAt'] })
export class Notification {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => NotificationType })
  type!: NotificationType;

  @Enum({ items: () => NotificationRouteTarget })
  routeTarget!: NotificationRouteTarget;

  @Property({ length: 180 })
  title!: string;

  @Property({ type: TextType })
  body!: string;

  @Property({ type: 'json', columnType: 'jsonb' })
  payload!: Record<string, unknown>;

  @Enum({
    items: () => NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority = NotificationPriority.NORMAL;

  @Property({ type: Date, nullable: true })
  readAt?: Date | null;

  @Property({ type: Date, nullable: true })
  openedAt?: Date | null;

  @Property({ type: Date, nullable: true })
  dismissedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}

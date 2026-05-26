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
  NotificationBatchStatus,
  NotificationDeliveryPolicy,
  NotificationPriority,
  NotificationRouteTarget,
  NotificationType,
} from '../../common/enums/notification.enums';

@Entity({ tableName: 'notification_batches' })
@Index({ properties: ['user', 'status', 'sendAfter'] })
@Index({ properties: ['dedupeKey'] })
export class NotificationBatch {
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

  @Property({ type: TextType })
  dedupeKey!: string;

  @Property({ type: TextType, nullable: true })
  userIntentKey?: string | null;

  @Enum({
    items: () => NotificationDeliveryPolicy,
    default: NotificationDeliveryPolicy.PUSH_DIGEST,
    nullable: true,
  })
  deliveryPolicy: NotificationDeliveryPolicy =
    NotificationDeliveryPolicy.PUSH_DIGEST;

  @Enum({
    items: () => NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority = NotificationPriority.NORMAL;

  @Enum({
    items: () => NotificationBatchStatus,
    default: NotificationBatchStatus.PENDING,
  })
  status: NotificationBatchStatus = NotificationBatchStatus.PENDING;

  @Property({ type: Date, defaultRaw: 'now()' })
  sendAfter: Date = new Date();

  @Property({ type: Date, nullable: true })
  sentAt?: Date | null;

  @Property({ type: TextType, nullable: true })
  skippedReason?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}

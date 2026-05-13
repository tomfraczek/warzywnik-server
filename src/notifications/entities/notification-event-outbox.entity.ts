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
  NotificationEventStatus,
  NotificationPriority,
  NotificationType,
} from '../../common/enums/notification.enums';

@Entity({ tableName: 'notification_event_outbox' })
@Index({ properties: ['user', 'status', 'availableAt'] })
@Index({ properties: ['dedupeKey'] })
export class NotificationEventOutbox {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => NotificationType })
  type!: NotificationType;

  @Property({ length: 64 })
  source!: string;

  @Property({ type: 'uuid', nullable: true })
  sourceId?: string | null;

  @Property({ type: 'json', columnType: 'jsonb' })
  payload!: Record<string, unknown>;

  @Property({ type: TextType })
  dedupeKey!: string;

  @Enum({
    items: () => NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority = NotificationPriority.NORMAL;

  @Enum({
    items: () => NotificationEventStatus,
    default: NotificationEventStatus.PENDING,
  })
  status: NotificationEventStatus = NotificationEventStatus.PENDING;

  @Property({ type: Date, defaultRaw: 'now()' })
  availableAt: Date = new Date();

  @Property({ type: Date, nullable: true })
  processedAt?: Date | null;

  @Property({ type: TextType, nullable: true })
  errorMessage?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}

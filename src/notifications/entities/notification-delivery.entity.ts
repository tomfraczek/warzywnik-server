import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { Notification } from './notification.entity';
import { NotificationBatch } from './notification-batch.entity';
import { UserDevice } from '../../devices/user-device.entity';
import { NotificationDeliveryStatus } from '../../common/enums/notification.enums';

@Entity({ tableName: 'notification_deliveries' })
@Index({ properties: ['status', 'createdAt'] })
@Index({ properties: ['expoTicketId'] })
export class NotificationDelivery {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Notification, { deleteRule: 'cascade' })
  notification!: Notification;

  @ManyToOne(() => NotificationBatch, { deleteRule: 'cascade' })
  batch!: NotificationBatch;

  @ManyToOne(() => UserDevice, { deleteRule: 'set null', nullable: true })
  userDevice?: UserDevice | null;

  @Enum({
    items: () => NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.PENDING,
  })
  status: NotificationDeliveryStatus = NotificationDeliveryStatus.PENDING;

  @Property({ length: 128, nullable: true })
  expoTicketId?: string | null;

  @Property({ length: 128, nullable: true })
  expoReceiptId?: string | null;

  @Property({ length: 64, nullable: true })
  errorCode?: string | null;

  @Property({ type: TextType, nullable: true })
  errorMessage?: string | null;

  @Property({ type: 'int', default: 0 })
  attemptCount: number = 0;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, nullable: true })
  sentAt?: Date | null;

  @Property({ type: Date, nullable: true })
  failedAt?: Date | null;
}

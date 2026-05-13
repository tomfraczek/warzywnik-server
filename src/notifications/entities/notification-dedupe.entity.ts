import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import { User } from '../../users/user.entity';
import { NotificationType } from '../../common/enums/notification.enums';

@Entity({ tableName: 'notification_dedupe' })
@Unique({ properties: ['user', 'type', 'dedupeKey'] })
@Index({ properties: ['expiresAt'] })
export class NotificationDedupe {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => NotificationType })
  type!: NotificationType;

  @Property({ type: TextType })
  dedupeKey!: string;

  @Property({ type: Date })
  expiresAt!: Date;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}

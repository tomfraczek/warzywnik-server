import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import {
  ReminderAction,
  ReminderStatus,
  ReminderType,
} from '../common/enums/reminder.enums';

export type ReminderPayload = {
  plantingId: string;
  diseaseId: string;
  plantingDiseaseId: string;
  action: ReminderAction;
};

@Entity({ tableName: 'reminders' })
@Index({ properties: ['status', 'scheduledAt'] })
@Index({ properties: ['user'] })
@Index({ properties: ['plantingDiseaseId'] })
export class Reminder {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Property({ type: Date })
  scheduledAt!: Date;

  @Enum({ items: () => ReminderStatus })
  status: ReminderStatus = ReminderStatus.PENDING;

  @Enum({ items: () => ReminderType })
  type!: ReminderType;

  @Property({ type: 'jsonb' })
  payload!: ReminderPayload;

  // ✅ nowa kolumna do szybkiego anulowania bez jsonb $contains
  @Property({ type: 'uuid', nullable: true })
  plantingDiseaseId?: string | null;

  @Property({ type: Date, nullable: true })
  sentAt?: Date | null;

  @Property({ fieldName: 'locked_at', nullable: true })
  lockedAt?: Date | null;

  @Property({ type: 'int', default: 0 })
  attempts: number = 0;

  @Property({ type: TextType, nullable: true })
  lastError?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

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

export type DiseaseReminderPayload = {
  kind?: 'disease';
  plantingId: string;
  diseaseId: string;
  plantingDiseaseId: string;
  action: ReminderAction;
};

export type PestReminderPayload = {
  kind: 'pest';
  plantingId: string;
  pestId: string;
  pestOccurrenceId: string;
  action: ReminderAction;
};

export type ActionTaskReminderPayload = {
  kind: 'action';
  actionTaskId: string;
  actionTemplateId?: string;
  actionTemplateName?: string;
  bedId?: string;
  plantingId?: string;
  growingSpaceId?: string;
  action: ReminderAction;
};

export type ReminderPayload =
  | DiseaseReminderPayload
  | PestReminderPayload
  | ActionTaskReminderPayload;

@Entity({ tableName: 'reminders' })
@Index({ properties: ['status', 'scheduledAt'] })
@Index({ properties: ['user'] })
@Index({ properties: ['plantingDiseaseId'] })
@Index({ properties: ['pestOccurrenceId'] })
@Index({ properties: ['actionTaskId'] })
export class Reminder {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ type: Date })
  scheduledAt!: Date;

  @Enum({ items: () => ReminderStatus })
  status: ReminderStatus = ReminderStatus.PENDING;

  @Enum({ items: () => ReminderType })
  type!: ReminderType;

  @Property({ type: 'jsonb' })
  payload!: ReminderPayload;

  @Property({ type: 'uuid', nullable: true })
  plantingDiseaseId?: string | null;

  @Property({ type: 'uuid', nullable: true })
  pestOccurrenceId?: string | null;

  @Property({ type: 'uuid', nullable: true })
  actionTaskId?: string | null;

  @Property({ type: Date, nullable: true })
  sentAt?: Date | null;

  @Property({ type: 'int', default: 0 })
  attempts: number = 0;

  @Property({ type: TextType, nullable: true })
  lastError?: string | null;

  @Property({ type: Date, nullable: true, fieldName: 'locked_at' })
  lockedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

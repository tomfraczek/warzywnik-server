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
import {
  ActionTaskSource,
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../common/enums/action.enums';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';
import { GrowingSpace } from '../growing-spaces/growing-space.entity';

@Entity({ tableName: 'action_tasks' })
@Index({ properties: ['user', 'dueAt'] })
@Index({ properties: ['user'] })
@Index({ properties: ['planting'] })
@Index({ properties: ['bed'] })
@Index({ properties: ['growingSpace'] })
@Index({ properties: ['status'] })
@Index({ properties: ['sourceRefId'] })
@Index({ properties: ['dedupeKey'] })
@Unique({
  properties: ['user', 'source', 'sourceRefId', 'dueAt', 'cycleIndex'],
})
export class ActionTask {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Enum({ items: () => ActionTaskTargetType })
  targetType!: ActionTaskTargetType;

  @ManyToOne(() => Planting, { nullable: true })
  planting?: Planting | null;

  @ManyToOne(() => Bed, { nullable: true })
  bed?: Bed | null;

  @ManyToOne(() => GrowingSpace, { nullable: true })
  growingSpace?: GrowingSpace | null;

  @Enum({ items: () => ActionTaskStatus })
  status: ActionTaskStatus = ActionTaskStatus.PENDING;

  @Enum({ items: () => ActionTaskSource })
  source: ActionTaskSource = ActionTaskSource.MANUAL;

  @Property({ type: 'uuid', nullable: true })
  sourceRefId?: string | null;

  @Property({ type: TextType, nullable: true })
  dedupeKey?: string | null;

  @Property({ type: 'int', default: 0 })
  cycleIndex: number = 0;

  @Property({ type: Date, nullable: true })
  originalDueAt?: Date | null;

  @Property({ type: 'boolean', default: false })
  isManuallyRescheduled: boolean = false;

  @Property({ type: Date, nullable: true })
  generatedAt?: Date | null;

  @Property({ type: Date, nullable: true })
  dueAt?: Date | null;

  @Property({ length: 180 })
  title!: string;

  @Property({ type: TextType, nullable: true })
  description?: string | null;

  @Property({ type: 'json', columnType: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @ManyToOne(() => ActionTemplate, { nullable: true })
  actionTemplate?: ActionTemplate | null;

  @Property({ type: Date, nullable: true })
  doneAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

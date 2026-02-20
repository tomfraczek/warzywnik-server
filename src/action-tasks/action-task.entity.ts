import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import {
  ActionTaskStatus,
  ActionTaskTargetType,
} from '../common/enums/action.enums';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

@Entity({ tableName: 'action_tasks' })
@Index({ properties: ['user', 'dueAt'] })
@Index({ properties: ['planting'] })
@Index({ properties: ['bed'] })
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

  @Enum({ items: () => ActionTaskStatus })
  status: ActionTaskStatus = ActionTaskStatus.PLANNED;

  @Property({ type: Date, nullable: true })
  dueAt?: Date | null;

  @Property({ length: 180 })
  title!: string;

  @Property({ type: TextType, nullable: true })
  description?: string | null;

  @ManyToOne(() => ActionTemplate, { nullable: true })
  actionTemplate?: ActionTemplate | null;

  @Property({ type: Date, nullable: true })
  doneAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

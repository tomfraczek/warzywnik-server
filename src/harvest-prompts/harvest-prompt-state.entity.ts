import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { Bed } from '../beds/bed.entity';

@Entity({ tableName: 'harvest_prompt_states' })
@Index({ properties: ['user'] })
@Index({ properties: ['bed'] })
@Index({ properties: ['planting'] })
@Unique({ properties: ['user', 'planting'] })
export class HarvestPromptState {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Planting)
  planting!: Planting;

  @ManyToOne(() => Bed)
  bed!: Bed;

  @Property({ type: Date, nullable: true, columnType: 'date' })
  lastShownOn?: Date | null;

  @Property({ type: Date, nullable: true, columnType: 'date' })
  snoozeUntil?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

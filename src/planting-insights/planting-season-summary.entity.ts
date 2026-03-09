import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Planting } from '../plantings/planting.entity';

@Entity({ tableName: 'planting_season_summaries' })
@Unique({ properties: ['planting'] })
@Index({ properties: ['seasonYear'] })
export class PlantingSeasonSummary {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Planting)
  planting!: Planting;

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'uuid' })
  bedId!: string;

  @Property({ type: 'uuid' })
  vegetableId!: string;

  @Property({ type: 'int' })
  seasonYear!: number;

  @Property({ type: Date, nullable: true })
  realStartDate?: Date | null;

  @Property({ type: Date, nullable: true })
  realEndDate?: Date | null;

  @Property({ type: 'int', nullable: true })
  seasonDurationDays?: number | null;

  @Property({ type: 'int', default: 0 })
  tasksCompleted: number = 0;

  @Property({ type: 'int', default: 0 })
  wateringCount: number = 0;

  @Property({ type: 'int', default: 0 })
  fertilizationCount: number = 0;

  @Property({ type: 'int', default: 0 })
  protectionCount: number = 0;

  @Property({ type: 'int', default: 0 })
  pestEvents: number = 0;

  @Property({ type: 'int', default: 0 })
  diseaseEvents: number = 0;

  @Property({ columnType: 'numeric', nullable: true })
  yieldKg?: number | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

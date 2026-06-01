import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { Planting } from './planting.entity';

@Entity({ tableName: 'harvest_results' })
@Index({ properties: ['planting'] })
export class HarvestResult {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Planting, { deleteRule: 'cascade' })
  planting!: Planting;

  @Property({ type: Date, nullable: true })
  harvestedAt?: Date | null;

  @Property({ columnType: 'numeric', nullable: true })
  yieldKg?: number | null;

  @Property({ type: 'int', nullable: true })
  qualityRating?: number | null;

  @Property({ type: TextType, nullable: true })
  notes?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

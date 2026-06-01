import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { Planting } from '../plantings/planting.entity';
import { Pest } from '../pests/pest.entity';
import { PestOccurrenceStatus } from '../common/enums/pest-occurrence.enums';

@Entity({ tableName: 'pest_occurrences' })
@Index({ properties: ['planting'] })
@Index({ properties: ['pest'] })
@Index({ properties: ['status'] })
@Index({ properties: ['nextCheckAt'] })
export class PestOccurrence {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Planting, { deleteRule: 'cascade' })
  planting!: Planting;

  @ManyToOne(() => Pest)
  pest!: Pest;

  @Enum({ items: () => PestOccurrenceStatus })
  status: PestOccurrenceStatus = PestOccurrenceStatus.SUSPECTED;

  @Property({ type: TextType, nullable: true })
  notes?: string | null;

  @Property({ type: 'int', default: 0 })
  reminderCount: number = 0;

  @Property({ type: Date, nullable: true })
  nextCheckAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

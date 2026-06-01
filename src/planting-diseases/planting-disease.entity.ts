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
import { Disease } from '../diseases/disease.entity';
import { PlantingDiseaseStatus } from '../common/enums/planting-disease.enums';
import { DiseaseSeverity } from '../common/enums/disease.enums';

@Entity({ tableName: 'planting_diseases' })
@Index({ properties: ['planting'] })
@Index({ properties: ['disease'] })
@Index({ properties: ['status'] })
@Index({ properties: ['nextCheckAt'] })
export class PlantingDisease {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Planting, { deleteRule: 'cascade' })
  planting!: Planting;

  @ManyToOne(() => Disease)
  disease!: Disease;

  @Enum({ items: () => PlantingDiseaseStatus })
  status!: PlantingDiseaseStatus;

  @Enum({ items: () => DiseaseSeverity, nullable: true })
  severity?: DiseaseSeverity | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  observedAt: Date = new Date();

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

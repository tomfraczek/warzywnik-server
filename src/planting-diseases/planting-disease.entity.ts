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
import {
  PlantingDiseaseSeverity,
  PlantingDiseaseStatus,
} from '../common/enums/planting-disease.enums';

@Entity({ tableName: 'planting_diseases' })
@Index({ properties: ['planting'] })
@Index({ properties: ['disease'] })
@Index({ properties: ['status'] })
export class PlantingDisease {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Planting)
  planting!: Planting;

  @ManyToOne(() => Disease)
  disease!: Disease;

  @Enum({ items: () => PlantingDiseaseStatus })
  status!: PlantingDiseaseStatus;

  @Enum({ items: () => PlantingDiseaseSeverity, nullable: true })
  severity?: PlantingDiseaseSeverity | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  observedAt: Date = new Date();

  @Property({ type: TextType, nullable: true })
  notes?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

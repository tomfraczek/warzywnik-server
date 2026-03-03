import {
  Entity,
  Enum,
  JsonType,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import {
  DemandLevel,
  DrainageLevel,
  SoilStructure,
} from '../common/enums/soil.enums';

@Entity({ tableName: 'soils' })
export class Soil {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ type: TextType })
  description!: string;

  @Enum({ items: () => SoilStructure })
  structure!: SoilStructure;

  @Enum({ items: () => DemandLevel })
  waterRetention!: DemandLevel;

  @Enum({ items: () => DrainageLevel })
  drainage!: DrainageLevel;

  @Property({ type: 'double', nullable: true })
  phMin?: number | null;

  @Property({ type: 'double', nullable: true })
  phMax?: number | null;

  @Enum({ items: () => DemandLevel })
  fertilityLevel!: DemandLevel;

  @Property({ type: JsonType })
  advantages!: string[];

  @Property({ type: JsonType })
  disadvantages!: string[];

  @Property({ type: JsonType })
  improvementTips!: string[];

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

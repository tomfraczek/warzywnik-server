import {
  Collection,
  Entity,
  Enum,
  JsonType,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import {
  DemandLevel,
  Month,
  SunExposure,
} from '../common/enums/vegetable.enums';
import {
  FertilizationStage,
  SowingMethod,
} from '../common/types/vegetable.types';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';
import { Soil } from '../soils/soil.entity';

@Entity({ tableName: 'vegetables' })
export class Vegetable {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 80 })
  @Unique()
  slug!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ length: 160, nullable: true })
  latinName?: string | null;

  @Property({ length: 255, nullable: true })
  imageUrl?: string | null;

  @Property({ type: TextType })
  description!: string;

  @Enum({ items: () => SunExposure, nullable: true })
  sunExposure?: SunExposure | null;

  @Enum({ items: () => DemandLevel, nullable: true })
  waterDemand?: DemandLevel | null;

  // ✅ NEW: dynamiczna gleba jako relacja (soil_id w DB)
  @ManyToOne(() => Soil, { nullable: true })
  soil?: Soil | null;

  @Enum({ items: () => DemandLevel, nullable: true })
  nutrientDemand?: DemandLevel | null;

  @Property({ type: JsonType, nullable: true })
  sowingMethods?: SowingMethod[] | null;

  @Property({ type: 'int', nullable: true })
  timeToHarvestDaysMin?: number | null;

  @Property({ type: 'int', nullable: true })
  timeToHarvestDaysMax?: number | null;

  @Property({ type: 'boolean', default: false })
  successionSowing: boolean = false;

  @Property({ type: 'int', nullable: true })
  successionIntervalDays?: number | null;

  @Enum({ items: () => Month, nullable: true })
  harvestStartMonth?: Month | null;

  @Enum({ items: () => Month, nullable: true })
  harvestEndMonth?: Month | null;

  @Property({ type: TextType, nullable: true })
  harvestSigns?: string | null;

  @Property({ type: JsonType, nullable: true })
  fertilizationStages?: FertilizationStage[] | null;

  @ManyToMany(() => Pest, undefined, {
    owner: true,
    pivotTable: 'vegetables_pests',
    joinColumn: 'vegetable_id',
    inverseJoinColumn: 'pest_id',
  })
  commonPests = new Collection<Pest>(this);

  @ManyToMany(() => Disease, undefined, {
    owner: true,
    pivotTable: 'vegetables_diseases',
    joinColumn: 'vegetable_id',
    inverseJoinColumn: 'disease_id',
  })
  commonDiseases = new Collection<Disease>(this);

  @ManyToMany(() => Vegetable, undefined, {
    owner: true,
    pivotTable: 'vegetables_good_companions',
    joinColumn: 'vegetable_id',
    inverseJoinColumn: 'companion_id',
  })
  goodCompanions = new Collection<Vegetable>(this);

  @ManyToMany(() => Vegetable, undefined, {
    owner: true,
    pivotTable: 'vegetables_bad_companions',
    joinColumn: 'vegetable_id',
    inverseJoinColumn: 'companion_id',
  })
  badCompanions = new Collection<Vegetable>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

import {
  Collection,
  Entity,
  Enum,
  JsonType,
  ManyToMany,
  OneToMany,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import {
  DemandLevel,
  Month,
  SunExposure,
  VegetableFamily,
  NutrientNeeds,
  RotationGroup,
  DominantNutrientDemand,
} from '../common/enums/vegetable.enums';
import {
  FertilizationStage,
  SowingMethod,
} from '../common/types/vegetable.types';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';
import { Soil } from '../soils/soil.entity';
import { VegetableActionRule } from './vegetable-action-rule.entity';

const VEGETABLE_FAMILY_ITEMS: string[] = [
  'BRASSICACEAE',
  'SOLANACEAE',
  'APIACEAE',
  'FABACEAE',
  'AMARANTHACEAE',
  'CUCURBITACEAE',
  'ASTERACEAE',
  'ALLIACEAE',
  'OTHER',
];

const NUTRIENT_NEEDS_ITEMS: string[] = ['LOW', 'MEDIUM', 'HIGH'];

const ROTATION_GROUP_ITEMS: string[] = [
  'HEAVY_FEEDER',
  'LIGHT_FEEDER',
  'LEGUME',
  'ROOT',
  'LEAF',
  'FRUITING',
  'OTHER',
];

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

  @Enum({ items: () => DemandLevel, nullable: true })
  nutrientDemand?: DemandLevel | null;

  @ManyToMany(() => Soil, undefined, {
    owner: true,
    pivotTable: 'vegetable_recommended_soils',
    joinColumn: 'vegetable_id',
    inverseJoinColumn: 'soil_id',
  })
  recommendedSoils = new Collection<Soil>(this);

  @Enum({ items: VEGETABLE_FAMILY_ITEMS, default: 'OTHER' })
  family!: VegetableFamily;

  @Enum({ items: NUTRIENT_NEEDS_ITEMS, default: 'MEDIUM' })
  nutrientNeeds!: NutrientNeeds;

  @Enum({ items: ROTATION_GROUP_ITEMS, default: 'OTHER' })
  rotationGroup!: RotationGroup;

  @Property({ type: 'int', nullable: true })
  minSoilDepthCm?: number | null;

  @Enum({ items: () => DominantNutrientDemand, nullable: true })
  dominantNutrientDemand?: DominantNutrientDemand | null;

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

  @OneToMany(() => VegetableActionRule, (rule) => rule.vegetable)
  actionRules = new Collection<VegetableActionRule>(this);

  @Property({ type: 'int', default: 1 })
  rulesVersion: number = 1;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

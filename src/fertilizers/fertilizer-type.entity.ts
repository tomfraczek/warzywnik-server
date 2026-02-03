import {
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import {
  ApplicationMethod,
  EffectLevel,
  FertilizerCategory,
  FertilizerForm,
  NutrientEffect,
  PhEffect,
  RecommendedFrequency,
  RiskLevel,
  SoilStructureEffect,
} from '../common/enums/fertilizer.enums';

@Entity({ tableName: 'fertilizer_types' })
@Index({ properties: ['category'] })
@Index({ properties: ['isActive'] })
export class FertilizerType {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 80 })
  @Unique()
  slug!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ type: TextType })
  description!: string;

  @Enum({ items: () => FertilizerCategory })
  category!: FertilizerCategory;

  @Enum({ items: () => FertilizerForm })
  form!: FertilizerForm;

  @Enum({ items: () => ApplicationMethod })
  applicationMethod!: ApplicationMethod;

  @Enum({ items: () => RiskLevel })
  riskLevel!: RiskLevel;

  @Enum({ items: () => NutrientEffect })
  nitrogenEffect!: NutrientEffect;

  @Enum({ items: () => NutrientEffect })
  phosphorusEffect!: NutrientEffect;

  @Enum({ items: () => NutrientEffect })
  potassiumEffect!: NutrientEffect;

  @Enum({ items: () => PhEffect })
  phEffect!: PhEffect;

  @Enum({ items: () => SoilStructureEffect })
  soilStructureEffect!: SoilStructureEffect;

  @Enum({ items: () => EffectLevel })
  waterRetentionEffect!: EffectLevel;

  @Enum({ items: () => EffectLevel })
  drainageEffect!: EffectLevel;

  @Enum({ items: () => RecommendedFrequency })
  recommendedFrequency!: RecommendedFrequency;

  @Property({ type: TextType, nullable: true })
  dosageGuidance?: string | null;

  @Property({ type: TextType, nullable: true })
  notes?: string | null;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

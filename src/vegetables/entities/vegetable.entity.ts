import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  ManyToOne,
  Collection,
  Cascade,
  OptionalProps,
} from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { VegetableTranslation } from './vegetable-translation.entity';
import { Soil } from '../../soil/entities/soil.entity';
import { CompanionRule } from '../../companion-rules/entities/companion-rule.entity';
import { VegetableWindow } from './vegetable-window.entity';
import { VegetableMedia } from './vegetable-media.entity';
import {
  PlantType,
  GrowthForm,
  LifeCycle,
  FrostResistance,
  SunExposure,
  WaterNeeds,
  NutrientNeeds,
  DifficultyLevel,
} from '../../common/enums/vegetable.enums';

@Entity()
export class Vegetable {
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @PrimaryKey()
  id: string = uuid();

  @Property({ unique: true })
  slug: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  latinName?: string;

  @Property({ nullable: true })
  family?: string;

  @Enum({ items: () => PlantType, nullable: true })
  plantType?: PlantType;

  @Enum({ items: () => GrowthForm, nullable: true })
  growthForm?: GrowthForm;

  @Enum({ items: () => LifeCycle, nullable: true })
  lifeCycle?: LifeCycle;

  @Property({ nullable: true })
  daysToHarvest?: number;

  @Property({ nullable: true })
  growingSeasonLength?: number;

  // Environment
  @Property({ nullable: true })
  minTemp?: number;

  @Property({ nullable: true })
  optimalTemp?: number;

  @Enum({ items: () => FrostResistance, nullable: true })
  frostResistance?: FrostResistance;

  @Enum({ items: () => SunExposure, nullable: true })
  sunExposure?: SunExposure;

  @ManyToOne(() => Soil, { nullable: true })
  soilType?: Soil;

  @Property({ nullable: true })
  soilPHMin?: number;

  @Property({ nullable: true })
  soilPHMax?: number;

  @Enum({ items: () => WaterNeeds, nullable: true })
  waterNeeds?: WaterNeeds;

  @Enum({ items: () => NutrientNeeds, nullable: true })
  nutrientNeeds?: NutrientNeeds;

  // Sowing/planting
  @Property({ nullable: true })
  seedDepth?: number;

  @Property({ nullable: true })
  rowSpacing?: number;

  @Property({ nullable: true })
  plantSpacing?: number;

  @Property({ nullable: true })
  germinationTimeDays?: number;

  @Property({ nullable: true })
  germinationTempMin?: number;

  @Property({ nullable: true })
  directSow?: boolean;

  @Property({ nullable: true })
  thinningRequired?: boolean;

  // Care
  @Property({ nullable: true })
  wateringFrequencyDays?: number;

  @Property({ type: 'text', nullable: true })
  fertilizingSchedule?: string;

  @Property({ nullable: true })
  mulchingRecommended?: boolean;

  @Property({ nullable: true })
  stakingRequired?: boolean;

  @Property({ nullable: true })
  pruningRequired?: boolean;

  // Pests / diseases (simple lists -> text[])
  @Property({ type: 'text[]', nullable: true })
  commonPests?: string[];

  @Property({ type: 'text[]', nullable: true })
  commonDiseases?: string[];

  @Property({ type: 'text[]', nullable: true })
  organicTreatments?: string[];

  @Property({ type: 'text[]', nullable: true })
  chemicalTreatments?: string[];

  // Companions via CompanionRule pivot
  @OneToMany(() => CompanionRule, (r) => r.source)
  companionRules = new Collection<CompanionRule>(this);

  // Rotation group identifier (family-based rules live in separate table)
  @Property({ nullable: true })
  rotationGroup?: string;

  // Yield
  @Property({ nullable: true })
  yieldPerM2?: number;

  @Enum({ items: () => Object, nullable: true })
  harvestFrequency?: string;

  @Property({ nullable: true })
  storageLife?: number;

  @Property({ type: 'text[]', nullable: true })
  storageConditions?: string[];

  // Nutrition
  @Property({ nullable: true })
  caloriesPer100g?: number;

  @Property({ type: 'jsonb', nullable: true })
  macros?: { protein?: number; fat?: number; carbs?: number; fiber?: number };

  @Property({ type: 'text[]', nullable: true })
  vitamins?: string[];

  @Property({ type: 'text[]', nullable: true })
  minerals?: string[];

  // Education
  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  howToGrow?: string;

  @Property({ type: 'text', nullable: true })
  commonMistakes?: string;

  @Property({ type: 'text', nullable: true })
  tips?: string;

  @Property({ type: 'text', nullable: true })
  faq?: string;

  @Property({ type: 'text[]', nullable: true })
  blogPosts?: string[];

  // Metadata
  @Enum({ items: () => DifficultyLevel, nullable: true })
  difficultyLevel?: DifficultyLevel;

  @Property({ nullable: true })
  spaceEfficiency?: number;

  @Property({ nullable: true })
  ecoScore?: number;

  @Property({ nullable: true })
  beeFriendly?: boolean;

  // Calendar windows and media
  @OneToMany(() => VegetableWindow, (w) => w.vegetable, {
    cascade: [Cascade.PERSIST],
  })
  calendarWindows = new Collection<VegetableWindow>(this);

  @OneToMany(() => VegetableMedia, (m) => m.vegetable, {
    cascade: [Cascade.PERSIST],
  })
  media = new Collection<VegetableMedia>(this);

  // translations
  @OneToMany(() => VegetableTranslation, (t) => t.vegetable, {
    cascade: [Cascade.PERSIST],
  })
  translations = new Collection<VegetableTranslation>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

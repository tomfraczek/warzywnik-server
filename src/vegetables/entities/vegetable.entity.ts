import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  ManyToOne,
  Collection,
  Cascade,
  OptionalProps, // 👈
} from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { VegetableTranslation } from './vegetable-translation.entity';
import { Soil } from '../../soil/entities/soil.entity';
import { CompanionRule } from '../../companion-rules/entities/companion-rule.entity';

export enum SunExposure {
  FULL_SUN = 'full_sun',
  PARTIAL_SHADE = 'partial_shade',
  SHADE = 'shade',
}

export enum WateringNeeds {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum FeedingClass {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

@Entity()
export class Vegetable {
  // 👇 TS wie, że przy create te pola są opcjonalne
  [OptionalProps]?: 'createdAt' | 'updatedAt';

  @PrimaryKey()
  id: string = uuid();

  @Property()
  slug: string;

  @Property()
  name: string;

  @Property({ nullable: true })
  latinName?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property()
  image: string;

  // 🌿 Uprawa
  @Property()
  sowingTimeStart: string;

  @Property()
  sowingTimeEnd: string;

  @Property()
  harvestTimeStart: string;

  @Property()
  harvestTimeEnd: string;

  @Property()
  germinationDays: number;

  @Property()
  sowingDepthCm: number;

  @Property()
  rowSpacingCm: number;

  @Property()
  plantSpacingCm: number;

  // 🪴 Typ uprawy i cechy
  @Property()
  isDirectSow: boolean;

  @Property()
  isPerennial: boolean;

  @Enum({ items: () => SunExposure })
  sunExposure: SunExposure;

  @Enum({ items: () => WateringNeeds })
  wateringNeeds: WateringNeeds;

  @ManyToOne(() => Soil, { nullable: true })
  soilType?: Soil;

  // 🌍 Care & fertilization
  @Enum({ items: () => FeedingClass, nullable: true })
  feedingClass?: FeedingClass;

  @Property({ nullable: true })
  mulchingRecommended?: boolean;

  @Property({ type: 'text', nullable: true })
  careTips?: string;

  // 🌍 Tłumaczenia
  @OneToMany(() => VegetableTranslation, (t) => t.vegetable, {
    cascade: [Cascade.PERSIST],
  })
  translations = new Collection<VegetableTranslation>(this);

  // 🔁 Relacje dobrego/złego sąsiedztwa
  @OneToMany(() => CompanionRule, (r) => r.source)
  companionRules = new Collection<CompanionRule>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

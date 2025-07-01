import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  ManyToOne,
  Collection,
  Cascade,
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

@Entity()
export class Vegetable {
  @PrimaryKey()
  id: string = uuid();

  // ✅ Podstawowe informacje
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

  // 🌍 Tłumaczenia
  @OneToMany(() => VegetableTranslation, (t) => t.vegetable, {
    cascade: [Cascade.PERSIST],
  })
  translations = new Collection<VegetableTranslation>(this);

  // 🔁 Relacje dobrego/złego sąsiedztwa
  @OneToMany(() => CompanionRule, (r) => r.source)
  companionRules = new Collection<CompanionRule>(this);
}

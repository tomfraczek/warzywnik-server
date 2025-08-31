import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from './vegetable.entity';

@Entity()
export class VegetableTranslation {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne()
  vegetable!: Vegetable;

  @Property()
  lang: string; // e.g. 'pl', 'en'

  @Property()
  name: string;

  @Property({ type: 'text' })
  description: string;

  @Property({ type: 'text', nullable: true })
  advantages?: string;

  @Property({ type: 'text', nullable: true })
  disadvantages?: string;

  // 🌱 NEW — descriptive cultivation sections (fertilization & care)
  @Property({ type: 'text', nullable: true })
  prePlanting?: string; // Fertilization before sowing/planting

  @Property({ type: 'text', nullable: true })
  inSeasonFeeding?: string; // Fertilization during the season

  @Property({ type: 'text', nullable: true })
  warnings?: string; // Warnings, e.g. avoid fresh manure

  @Property({ type: 'text', nullable: true })
  watering?: string; // Watering recommendations

  @Property({ type: 'text', nullable: true })
  mulching?: string; // Mulching instructions

  @Property({ type: 'text', nullable: true })
  trainingSupport?: string; // Supports, pruning, training (e.g., tomatoes)

  @Property({ type: 'text', nullable: true })
  weeding?: string; // Weeding and soil loosening

  @Property({ type: 'text', nullable: true })
  pestPrevention?: string; // Pest/disease prevention
}

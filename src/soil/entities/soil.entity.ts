import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
  Cascade,
} from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from '../../vegetables/entities/vegetable.entity';
import { SoilTranslation } from '../translations/entities/soil-translation.entity';

@Entity()
export class Soil {
  @PrimaryKey()
  id: string = uuid();

  @Property()
  name: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  advantages?: string;

  @Property({ type: 'text', nullable: true })
  disadvantages?: string;

  @OneToMany(() => Vegetable, (v) => v.soilType)
  suitableVegetables = new Collection<Vegetable>(this);

  @OneToMany(() => SoilTranslation, (t) => t.soil, {
    cascade: [Cascade.PERSIST],
  })
  translations = new Collection<SoilTranslation>(this);
}

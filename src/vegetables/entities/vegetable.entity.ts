import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
  Cascade,
} from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { VegetableTranslation } from './vegetable-translation.entity';

@Entity()
export class Vegetable {
  @PrimaryKey()
  id: string = uuid();

  @Property()
  imageUrl: string;

  @Property()
  sowingStartMonth: string;

  @Property()
  sowingEndMonth: string;

  @Property()
  harvestStartMonth: string;

  @Property()
  harvestEndMonth: string;

  @Property()
  sowingDepthCm: number;

  @Property()
  spacingCm: number;

  @Property()
  germinationDays: number;

  @Property()
  directSow: boolean;

  @OneToMany(() => VegetableTranslation, (t) => t.vegetable, {
    cascade: [Cascade.PERSIST],
  })
  translations = new Collection<VegetableTranslation>(this);
}

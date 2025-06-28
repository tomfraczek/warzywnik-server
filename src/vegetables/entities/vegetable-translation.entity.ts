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
  lang: string;

  @Property()
  name: string;

  @Property()
  description: string;
}

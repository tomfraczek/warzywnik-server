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
  lang: string; // np. 'pl', 'en'

  @Property()
  name: string;

  @Property({ type: 'text' })
  description: string;

  @Property({ type: 'text', nullable: true })
  advantages?: string;

  @Property({ type: 'text', nullable: true })
  disadvantages?: string;
}

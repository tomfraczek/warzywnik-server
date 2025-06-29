import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from '../../vegetables/entities/vegetable.entity';

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
}

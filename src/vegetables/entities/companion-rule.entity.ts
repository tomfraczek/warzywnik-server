import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Vegetable } from './vegetable.entity';
import { v4 as uuid } from 'uuid';

export type CompanionType = 'good' | 'bad';

@Entity()
export class CompanionRule {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne()
  source!: Vegetable;

  @ManyToOne()
  target!: Vegetable;

  @Property()
  type!: CompanionType;
}

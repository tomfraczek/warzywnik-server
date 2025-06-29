import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from '../../vegetables/entities/vegetable.entity';

@Entity()
export class CompanionRule {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne(() => Vegetable)
  source!: Vegetable;

  @ManyToOne(() => Vegetable)
  target!: Vegetable;

  @Property()
  isGood: boolean;
}

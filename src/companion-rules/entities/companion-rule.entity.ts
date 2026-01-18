import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from '../../vegetables/entities/vegetable.entity';
import { CompanionRelation } from '../../common/enums/vegetable.enums';

@Entity()
export class CompanionRule {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne(() => Vegetable)
  source!: Vegetable;

  @ManyToOne(() => Vegetable)
  target!: Vegetable;

  @Enum({ items: () => CompanionRelation })
  relation!: CompanionRelation;

  @Property({ nullable: true, type: 'text' })
  note?: string;
}

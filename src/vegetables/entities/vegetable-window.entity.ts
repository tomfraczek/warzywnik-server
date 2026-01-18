import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from './vegetable.entity';
import { WindowType } from '../../common/enums/vegetable.enums';

@Entity()
export class VegetableWindow {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne(() => Vegetable)
  vegetable!: Vegetable;

  @Property({ type: 'text' })
  type: WindowType;

  @Property()
  startMonth: number;

  @Property()
  endMonth: number;
}

import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Vegetable } from './vegetable.entity';
import { MediaType } from '../../common/enums/vegetable.enums';

@Entity()
export class VegetableMedia {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne(() => Vegetable)
  vegetable!: Vegetable;

  @Property({ type: 'text' })
  type: MediaType;

  @Property({ type: 'text' })
  url: string;

  @Property({ nullable: true })
  title?: string;

  @Property({ nullable: true })
  sortOrder?: number;
}

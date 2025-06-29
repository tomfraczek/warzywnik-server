import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { Soil } from '../../../soil/entities/soil.entity';

@Entity()
export class SoilTranslation {
  @PrimaryKey()
  id: string = uuid();

  @ManyToOne()
  soil!: Soil;

  @Property()
  lang: string;

  @Property()
  name: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  advantages?: string;

  @Property({ type: 'text', nullable: true })
  disadvantages?: string;
}

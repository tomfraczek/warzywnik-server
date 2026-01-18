import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuid } from 'uuid';
import { RotationRelation } from '../../common/enums/vegetable.enums';

@Entity()
export class RotationFamilyRule {
  @PrimaryKey()
  id: string = uuid();

  @Property()
  fromFamily!: string;

  @Property()
  toFamily!: string;

  @Property({ type: 'text' })
  relation!: RotationRelation;
}

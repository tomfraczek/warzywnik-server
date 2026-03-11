import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { GrowingSpaceType } from '../common/enums/growing-space.enums';
import { Bed } from '../beds/bed.entity';

@Entity({ tableName: 'growing_spaces' })
@Index({ properties: ['user'] })
@Index({ properties: ['type'] })
@Unique({ properties: ['user', 'name'] })
export class GrowingSpace {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Property({ length: 120 })
  name!: string;

  @Enum({ items: () => GrowingSpaceType })
  type: GrowingSpaceType = GrowingSpaceType.OUTDOOR;

  @OneToMany(() => Bed, (bed: Bed) => bed.growingSpace)
  beds = new Collection<Bed>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

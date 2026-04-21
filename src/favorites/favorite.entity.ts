import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { FavoriteTargetType } from '../common/enums/favorite.enums';

@Entity({ tableName: 'favorites' })
@Index({ properties: ['user'] })
@Index({ properties: ['targetType'] })
@Index({ properties: ['targetSlug'] })
@Unique({ properties: ['user', 'targetType', 'targetSlug'] })
export class Favorite {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => FavoriteTargetType })
  targetType!: FavoriteTargetType;

  @Property({ length: 180 })
  targetSlug!: string;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}

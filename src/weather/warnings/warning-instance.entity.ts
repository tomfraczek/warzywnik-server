import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import { User } from '../../users/user.entity';
import { Bed } from '../../beds/bed.entity';
import { Planting } from '../../plantings/planting.entity';
import { WarningCode, WarningScope } from '../../common/enums/warning.enums';
import { WeatherBasis } from '../weather.types';

@Entity({ tableName: 'warning_instances' })
@Index({ properties: ['user', 'isActive'] })
@Index({ properties: ['user', 'code', 'scope', 'isActive'] })
@Index({ properties: ['validTo'] })
@Unique({ properties: ['user', 'dedupeKey'] })
export class WarningInstance {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => WarningScope })
  scope!: WarningScope;

  @ManyToOne(() => Bed, { nullable: true, deleteRule: 'set null' })
  bed?: Bed | null;

  @ManyToOne(() => Planting, { nullable: true, deleteRule: 'set null' })
  planting?: Planting | null;

  @Enum({ items: () => WarningCode })
  code!: WarningCode;

  @Property({ type: 'json', columnType: 'jsonb' })
  values!: Record<string, string | number>;

  @Property({ type: 'json', columnType: 'jsonb', nullable: true })
  details?: Record<string, unknown> | null;

  @Property({ type: Date })
  computedAt!: Date;

  @Property({ type: Date })
  validFrom!: Date;

  @Property({ type: Date })
  validTo!: Date;

  @Property({ type: Date, nullable: true })
  snapshotFetchedAt?: Date | null;

  @Enum({ items: ['FRESH', 'STALE', 'NONE'] })
  weatherBasis: WeatherBasis = 'NONE';

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: TextType })
  dedupeKey!: string;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

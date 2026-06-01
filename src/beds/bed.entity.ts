import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { Soil } from '../soils/soil.entity';
import { Planting } from '../plantings/planting.entity';
import { CultivationEnvironment } from '../common/enums/bed.enums';
import { GrowingSpace } from '../growing-spaces/growing-space.entity';

@Entity({ tableName: 'beds' })
@Index({ properties: ['user'] })
@Index({ properties: ['isActive'] })
export class Bed {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ length: 120 })
  name!: string;

  @Property({ type: TextType, nullable: true })
  description?: string | null;

  @Property({ length: 120, nullable: true })
  locationLabel?: string | null;

  @Property({ type: 'int', nullable: true })
  depthCm?: number | null;

  @ManyToOne(() => Soil, { nullable: true })
  soil?: Soil | null;

  @ManyToOne(() => GrowingSpace)
  growingSpace!: GrowingSpace;

  @Property({ type: 'boolean', default: false })
  soilTestingEnabled: boolean = false;

  @Property({ type: 'int', nullable: true })
  measuredN?: number | null;

  @Property({ type: 'int', nullable: true })
  measuredP?: number | null;

  @Property({ type: 'int', nullable: true })
  measuredK?: number | null;

  @Property({ type: 'double', nullable: true })
  measuredPh?: number | null;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Enum({
    items: () => CultivationEnvironment,
    default: CultivationEnvironment.GROUND_OUTDOOR,
  })
  cultivationEnvironment: CultivationEnvironment =
    CultivationEnvironment.GROUND_OUTDOOR;

  @OneToMany(() => Planting, (planting: Planting) => planting.bed)
  plantings = new Collection<Planting>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

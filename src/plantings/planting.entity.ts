import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { PlantingStatus } from '../common/enums/planting.enums';

@Entity({ tableName: 'plantings' })
@Index({ properties: ['user'] })
@Index({ properties: ['bed'] })
@Index({ properties: ['vegetable'] })
@Index({ properties: ['status'] })
@Index({ properties: ['plannedStartDate'] })
@Index({ properties: ['harvestedAt'] })
export class Planting {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Bed)
  bed!: Bed;

  @ManyToOne(() => Vegetable)
  vegetable!: Vegetable;

  @Property({ type: Date })
  plannedStartDate!: Date;

  @Property({ type: Date, nullable: true })
  actualStartDate?: Date | null;

  @Enum({ items: () => PlantingStatus, default: PlantingStatus.PLANNED })
  status: PlantingStatus = PlantingStatus.PLANNED;

  @Property({ type: Date, nullable: true })
  harvestedAt?: Date | null;

  @Property({ type: TextType, nullable: true })
  notes?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

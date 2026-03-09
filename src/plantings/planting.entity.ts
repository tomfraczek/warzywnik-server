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
import { Bed } from '../beds/bed.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import {
  PlantingStartMethod,
  PlantingStatus,
} from '../common/enums/planting.enums';
import { HarvestResult } from './harvest-result.entity';

@Entity({ tableName: 'plantings' })
@Index({ properties: ['user'] })
@Index({ properties: ['bed'] })
@Index({ properties: ['vegetable'] })
@Index({ properties: ['status'] })
@Index({ properties: ['plannedStartDate'] })
@Index({ properties: ['harvestedAt'] })
@Index({ properties: ['sowedAt'] })
@Index({ properties: ['transplantedAt'] })
@Index({ properties: ['harvestWindowStart'] })
@Index({ properties: ['harvestWindowEnd'] })
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

  @Enum({
    items: () => PlantingStartMethod,
    default: PlantingStartMethod.DIRECT_SOW,
  })
  startMethod: PlantingStartMethod = PlantingStartMethod.DIRECT_SOW;

  @Property({ type: Date, nullable: true })
  sowedAt?: Date | null;

  @Property({ type: Date, nullable: true })
  transplantedAt?: Date | null;

  @Property({ type: Date, nullable: true })
  harvestWindowStart?: Date | null;

  @Property({ type: Date, nullable: true })
  harvestWindowEnd?: Date | null;

  @Property({ length: 64, default: 'Europe/Warsaw' })
  timelineTimezone: string = 'Europe/Warsaw';

  @Property({ type: 'int', default: 1 })
  appliedRulesVersion: number = 1;

  @Enum({ items: () => PlantingStatus, default: PlantingStatus.PLANNED })
  status: PlantingStatus = PlantingStatus.PLANNED;

  @Property({ type: Date, nullable: true })
  harvestedAt?: Date | null;

  @Property({ type: TextType, nullable: true })
  notes?: string | null;

  @Property({ columnType: 'numeric', nullable: true })
  yieldKg?: number | null;

  @Property({ type: 'int', nullable: true })
  yieldQualityRating?: number | null;

  @Property({ type: TextType, nullable: true })
  yieldNotes?: string | null;

  @OneToMany(() => HarvestResult, (hr) => hr.planting, {
    orphanRemoval: true,
  })
  harvestResults = new Collection<HarvestResult>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

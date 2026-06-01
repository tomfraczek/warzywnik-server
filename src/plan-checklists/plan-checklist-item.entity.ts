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
import { User } from '../users/user.entity';
import { Bed } from '../beds/bed.entity';
import { Planting } from '../plantings/planting.entity';
import { Vegetable } from '../vegetables/vegetable.entity';
import { Soil } from '../soils/soil.entity';
import { FertilizerType } from '../fertilizers/fertilizer-type.entity';
import { PlanChecklistTemplate } from './plan-checklist-template.entity';
import {
  PlanChecklistPriority,
  PlanChecklistScope,
  PlanChecklistSource,
  PlanChecklistStatus,
} from '../common/enums/plan-checklist.enums';

@Entity({ tableName: 'plan_checklist_items' })
@Index({ properties: ['user', 'bed'] })
@Index({ properties: ['planting'] })
@Index({ properties: ['status'] })
@Index({ properties: ['source'] })
@Index({ properties: ['sourceKey'] })
@Index({ properties: ['dedupeKey'] })
@Index({ properties: ['suppressedAt'] })
@Index({ properties: ['archivedAt'] })
@Unique({ properties: ['user', 'source', 'dedupeKey'] })
export class PlanChecklistItem {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @ManyToOne(() => Bed, { deleteRule: 'cascade' })
  bed!: Bed;

  @ManyToOne(() => Planting, { nullable: true })
  planting?: Planting | null;

  @ManyToOne(() => Vegetable, { nullable: true })
  vegetable?: Vegetable | null;

  @ManyToOne(() => Soil, { nullable: true })
  soil?: Soil | null;

  @ManyToOne(() => FertilizerType, { nullable: true })
  fertilizer?: FertilizerType | null;

  @ManyToOne(() => PlanChecklistTemplate, { nullable: true })
  template?: PlanChecklistTemplate | null;

  @Enum({ items: () => PlanChecklistScope })
  scope!: PlanChecklistScope;

  @Enum({ items: () => PlanChecklistStatus })
  status: PlanChecklistStatus = PlanChecklistStatus.PENDING;

  @Enum({ items: () => PlanChecklistSource })
  source!: PlanChecklistSource;

  @Property({ type: TextType, nullable: true })
  sourceKey?: string | null;

  @Property({ type: TextType, nullable: true })
  dedupeKey?: string | null;

  @Enum({ items: () => PlanChecklistPriority })
  priority: PlanChecklistPriority = PlanChecklistPriority.MEDIUM;

  @Property({ length: 255 })
  title!: string;

  @Property({ type: TextType, nullable: true })
  description?: string | null;

  @Property({ type: TextType, nullable: true })
  reason?: string | null;

  @Property({ type: 'json', columnType: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ type: 'boolean', default: false })
  isUserModified: boolean = false;

  @Property({ type: Date, nullable: true })
  suppressedAt?: Date | null;

  @Property({ type: Date, nullable: true })
  archivedAt?: Date | null;

  @Property({ type: TextType, nullable: true })
  archiveReason?: string | null;

  @Property({ type: Date, nullable: true })
  doneAt?: Date | null;

  @Property({ type: Date, nullable: true })
  skippedAt?: Date | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

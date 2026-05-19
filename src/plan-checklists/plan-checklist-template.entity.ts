import {
  Entity,
  Enum,
  Index,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import {
  PlanChecklistPriority,
  PlanChecklistScope,
} from '../common/enums/plan-checklist.enums';

@Entity({ tableName: 'plan_checklist_templates' })
@Index({ properties: ['isActive'] })
export class PlanChecklistTemplate {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 180, unique: true })
  slug!: string;

  @Property({ length: 255 })
  titleTemplate!: string;

  @Property({ type: TextType, nullable: true })
  descriptionTemplate?: string | null;

  @Property({ type: TextType, nullable: true })
  reasonTemplate?: string | null;

  @Enum({ items: () => PlanChecklistScope })
  scope: PlanChecklistScope = PlanChecklistScope.BED;

  @Enum({ items: () => PlanChecklistPriority })
  priority: PlanChecklistPriority = PlanChecklistPriority.MEDIUM;

  @Property({ type: 'json', columnType: 'jsonb', nullable: true })
  conditions?: Record<string, unknown> | null;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: 'int', default: 1 })
  version: number = 1;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

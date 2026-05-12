import {
  Collection,
  Entity,
  Enum,
  ManyToMany,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import {
  ActionTemplateAggregationScope,
  ActionTemplateEnvironment,
  ActionTemplateGenerationMode,
  ActionTemplatePriority,
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';

@Entity({ tableName: 'action_templates' })
export class ActionTemplate {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ length: 180, unique: true })
  slug!: string;

  @Property({ type: TextType, nullable: true })
  description?: string | null;

  @Enum({ items: () => ActionTemplateTarget })
  target: ActionTemplateTarget = ActionTemplateTarget.PLANTING;

  @Enum({ items: () => ActionTemplateEnvironment })
  environment: ActionTemplateEnvironment = ActionTemplateEnvironment.ANY;

  @Enum({ items: () => ActionTemplateType })
  type: ActionTemplateType = ActionTemplateType.MANUAL_CUSTOM;

  @Enum({ items: () => ActionTemplateGenerationMode })
  generationMode: ActionTemplateGenerationMode =
    ActionTemplateGenerationMode.AUTO;

  @Enum({ items: () => ActionTemplatePriority })
  priority: ActionTemplatePriority = ActionTemplatePriority.MEDIUM;

  @Enum({ items: () => ActionTemplateAggregationScope })
  aggregationScope: ActionTemplateAggregationScope =
    ActionTemplateAggregationScope.NONE;

  @Property({ type: 'int', nullable: true })
  maxAutoOccurrencesPerPlanting?: number | null;

  @Property({ type: 'int', nullable: true })
  minDaysBetweenOccurrences?: number | null;

  @Property({ type: 'boolean', default: false })
  requiresUserConfirmation: boolean = false;

  @Property({ type: 'int', nullable: true })
  defaultDueOffsetDays: number | null = null;

  @Property({ type: 'boolean', default: false })
  isUserSelectable: boolean = false;

  @ManyToMany(() => Pest, 'recommendedActions')
  recommendedForPests = new Collection<Pest>(this);

  @ManyToMany(() => Disease, 'recommendedActions')
  recommendedForDiseases = new Collection<Disease>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

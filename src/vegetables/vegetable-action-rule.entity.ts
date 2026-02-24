import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { Vegetable } from './vegetable.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

type ActionRuleTriggerValue =
  | 'ON_SOWED'
  | 'AFTER_SOWING_DAYS'
  | 'ON_TRANSPLANTED'
  | 'AFTER_TRANSPLANT_DAYS'
  | 'BEFORE_TRANSPLANT_DAYS'
  | 'ON_HARVEST_WINDOW_START'
  | 'BEFORE_HARVEST_WINDOW_START_DAYS'
  | 'ON_HARVEST_CONFIRMED'
  | 'AFTER_HARVEST_DAYS';

type ActionRuleScheduleValue = 'ONCE' | 'EVERY_N_DAYS';

type PlantingStartMethodValue = 'DIRECT_SOW' | 'TRANSPLANT';

const ACTION_RULE_TRIGGER_ITEMS: ActionRuleTriggerValue[] = [
  'ON_SOWED',
  'AFTER_SOWING_DAYS',
  'ON_TRANSPLANTED',
  'AFTER_TRANSPLANT_DAYS',
  'BEFORE_TRANSPLANT_DAYS',
  'ON_HARVEST_WINDOW_START',
  'BEFORE_HARVEST_WINDOW_START_DAYS',
  'ON_HARVEST_CONFIRMED',
  'AFTER_HARVEST_DAYS',
];

const ACTION_RULE_SCHEDULE_ITEMS: ActionRuleScheduleValue[] = [
  'ONCE',
  'EVERY_N_DAYS',
];

const PLANTING_START_METHOD_ITEMS: PlantingStartMethodValue[] = [
  'DIRECT_SOW',
  'TRANSPLANT',
];

@Entity({ tableName: 'vegetable_action_rules' })
@Index({ properties: ['vegetable'] })
@Index({ properties: ['actionTemplate'] })
@Unique({
  properties: [
    'vegetable',
    'actionTemplate',
    'trigger',
    'offsetDays',
    'schedule',
    'everyNDays',
  ],
})
export class VegetableActionRule {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Vegetable)
  vegetable!: Vegetable;

  @ManyToOne(() => ActionTemplate)
  actionTemplate!: ActionTemplate;

  @Enum({ items: ACTION_RULE_TRIGGER_ITEMS })
  trigger!: ActionRuleTriggerValue;

  @Property({ type: 'int', default: 0 })
  offsetDays: number = 0;

  @Enum({ items: ACTION_RULE_SCHEDULE_ITEMS, default: 'ONCE' })
  schedule: ActionRuleScheduleValue = 'ONCE';

  @Property({ type: 'int', nullable: true, fieldName: 'every_n_days' })
  everyNDays?: number | null;

  @Property({ type: 'int', nullable: true })
  occurrencesLimit?: number | null;

  @Enum({ items: PLANTING_START_METHOD_ITEMS, array: true, nullable: true })
  applyIfStartMethod?: PlantingStartMethodValue[] | null;

  @Property({ type: 'boolean', default: true })
  isEnabled: boolean = true;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

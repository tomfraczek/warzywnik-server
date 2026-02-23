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
import {
  ActionRuleSchedule,
  ActionRuleTrigger,
} from '../common/enums/action.enums';
import { PlantingStartMethod } from '../common/enums/planting.enums';

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

  @Enum({ items: () => ActionRuleTrigger })
  trigger!: ActionRuleTrigger;

  @Property({ type: 'int', default: 0 })
  offsetDays: number = 0;

  @Enum({ items: () => ActionRuleSchedule, default: ActionRuleSchedule.ONCE })
  schedule: ActionRuleSchedule = ActionRuleSchedule.ONCE;

  @Property({ type: 'int', nullable: true })
  everyNDays?: number | null;

  @Property({ type: 'int', nullable: true })
  occurrencesLimit?: number | null;

  @Enum({ items: () => PlantingStartMethod, array: true, nullable: true })
  applyIfStartMethod?: PlantingStartMethod[] | null;

  @Property({ type: 'boolean', default: true })
  isEnabled: boolean = true;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

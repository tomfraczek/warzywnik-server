import {
  Collection,
  Entity,
  Enum,
  ManyToMany,
  PrimaryKey,
  Property,
  TextType,
  Unique,
} from '@mikro-orm/core';
import {
  ActionTemplateTarget,
  ActionTemplateType,
} from '../common/enums/action.enums';
import { Pest } from '../pests/pest.entity';
import { Disease } from '../diseases/disease.entity';

@Entity({ tableName: 'action_templates' })
export class ActionTemplate {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 80 })
  @Unique()
  slug!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ type: TextType, nullable: true })
  description?: string | null;

  @Enum({ items: () => ActionTemplateTarget })
  target: ActionTemplateTarget = ActionTemplateTarget.PLANTING;

  @Enum({ items: () => ActionTemplateType })
  type: ActionTemplateType = ActionTemplateType.OTHER;

  @Property({ type: 'int', default: 0 })
  defaultDueOffsetDays: number = 0;

  @ManyToMany(() => Pest, 'recommendedActions')
  recommendedForPests = new Collection<Pest>(this);

  @ManyToMany(() => Disease, 'recommendedActions')
  recommendedForDiseases = new Collection<Disease>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

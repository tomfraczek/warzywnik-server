import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import {
  ActionRecommendationSeverity,
  ActionRecommendationStatus,
} from '../common/enums/action.enums';
import { User } from '../users/user.entity';
import { Planting } from '../plantings/planting.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

@Entity({ tableName: 'action_recommendations' })
@Index({ properties: ['user', 'planting', 'status'] })
@Index({ properties: ['actionTemplate'] })
export class ActionRecommendation {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Planting)
  planting!: Planting;

  @ManyToOne(() => ActionTemplate)
  actionTemplate!: ActionTemplate;

  @Property({ type: TextType })
  reason!: string;

  @Enum({ items: () => ActionRecommendationSeverity })
  severity: ActionRecommendationSeverity = ActionRecommendationSeverity.MEDIUM;

  @Enum({ items: () => ActionRecommendationStatus })
  status: ActionRecommendationStatus = ActionRecommendationStatus.ACTIVE;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

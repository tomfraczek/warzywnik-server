import {
  Collection,
  Entity,
  ManyToMany,
  PrimaryKey,
  Property,
  Unique,
  TextType,
} from '@mikro-orm/core';
import { ActionTemplate } from '../action-templates/action-template.entity';

@Entity({ tableName: 'pests' })
export class Pest {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 80 })
  @Unique()
  slug!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ type: TextType })
  description!: string;

  @Property({ type: TextType, nullable: true })
  symptoms?: string | null;

  @Property({ type: TextType, nullable: true })
  prevention?: string | null;

  @Property({ type: TextType, nullable: true })
  treatment?: string | null;

  @ManyToMany(() => ActionTemplate, undefined, {
    owner: true,
    pivotTable: 'pest_recommended_actions',
    joinColumn: 'pest_id',
    inverseJoinColumn: 'action_template_id',
  })
  recommendedActions = new Collection<ActionTemplate>(this);

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

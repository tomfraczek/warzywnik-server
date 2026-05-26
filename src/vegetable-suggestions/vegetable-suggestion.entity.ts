import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'vegetable_suggestions' })
@Index({ properties: ['createdAt'] })
@Index({ properties: ['name'] })
export class VegetableSuggestion {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 80 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  note?: string | null;

  @Property({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

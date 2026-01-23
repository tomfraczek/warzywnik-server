import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  TextType,
} from '@mikro-orm/core';

@Entity({ tableName: 'diseases' })
export class Disease {
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

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

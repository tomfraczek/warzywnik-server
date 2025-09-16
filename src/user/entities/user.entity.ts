import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  OptionalProps,
} from '@mikro-orm/core';

@Entity({ tableName: 'user' })
export class User {
  // Fields listed here are optional for RequiredEntityData<T>
  [OptionalProps]?: 'isAdmin' | 'status' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ unique: true })
  @Unique()
  clerkUserId!: string;

  // Internal flags/role — never accept from client DTO
  @Property({ default: false })
  isAdmin: boolean = false;

  @Property({ columnType: 'text', default: 'active' })
  status: 'active' | 'blocked' = 'active';

  @Property({ defaultRaw: 'now()' })
  createdAt!: Date;

  @Property({ onUpdate: () => new Date(), defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}

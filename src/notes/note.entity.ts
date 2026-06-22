import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  TextType,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';

@Entity({ tableName: 'notes' })
@Index({ properties: ['user'] })
export class Note {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ length: 200, nullable: true })
  title?: string | null;

  @Property({ type: TextType })
  content!: string;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

import {
  Entity,
  PrimaryKey,
  Property,
  OneToOne,
  OptionalProps,
} from '@mikro-orm/core';
import { User } from './user.entity';

@Entity({ tableName: 'user_settings' })
export class UserSettings {
  [OptionalProps]?:
    | 'unitLength'
    | 'unitArea'
    | 'locale'
    | 'darkMode'
    | 'updatedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  // unique na relacji wystarczy (i tak powstaje w 1:1), można jawnie dopisać:
  @OneToOne(() => User, { owner: true, unique: true })
  user!: User;

  @Property({ columnType: 'text' })
  unitLength: 'cm' | 'inch' = 'cm';

  @Property({ columnType: 'text' })
  unitArea: 'm2' | 'ft2' = 'm2';

  @Property({ columnType: 'text', default: 'pl' })
  locale: 'pl' | 'en' = 'pl';

  @Property({ default: false })
  darkMode: boolean = false;

  @Property({ onUpdate: () => new Date(), defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}

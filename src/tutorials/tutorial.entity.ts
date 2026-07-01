import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';

export enum TutorialKey {
  HOME = 'home',
  BEDS = 'beds',
  BED_DETAILS = 'bedDetails',
  ADD_PLANTING = 'addPlanting',
  CALENDAR = 'calendar',
  ARTICLES = 'articles',
  PROFILE = 'profile',
  NOTIFICATIONS = 'notifications',
}

export const TUTORIAL_KEYS = Object.values(TutorialKey);

@Entity({ tableName: 'user_tutorials' })
@Unique({ properties: ['user', 'tutorialKey'] })
@Index({ properties: ['user'] })
export class UserTutorial {
  @Property({ type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum({ items: () => TutorialKey })
  tutorialKey!: TutorialKey;

  @Property({ type: 'boolean', default: false })
  completed: boolean = false;

  @Property({ type: 'int', default: 1 })
  version: number = 1;

  @Property({ type: Date, nullable: true })
  completedAt: Date | null = null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

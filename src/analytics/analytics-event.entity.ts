import {
  Entity,
  Enum,
  Index,
  JsonType,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { User } from '../users/user.entity';
import { AnalyticsEventType } from '../common/enums/analytics.enums';
import { FavoriteTargetType } from '../common/enums/favorite.enums';

@Entity({ tableName: 'analytics_events' })
@Index({ properties: ['eventType'] })
@Index({ properties: ['targetType', 'targetSlug'] })
@Index({ properties: ['occurredAt'] })
@Unique({ properties: ['idempotencyKey'] })
export class AnalyticsEvent {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => User, { nullable: true, deleteRule: 'set null' })
  user?: User | null;

  @Property({ length: 120, nullable: true })
  sessionId?: string | null;

  @Enum({ items: () => AnalyticsEventType })
  eventType!: AnalyticsEventType;

  @Enum({ items: () => FavoriteTargetType })
  targetType!: FavoriteTargetType;

  @Property({ length: 180 })
  targetSlug!: string;

  @Property({ type: 'int', nullable: true })
  valueInt?: number | null;

  @Property({ columnType: 'numeric(12,2)', nullable: true })
  valueNum?: number | null;

  @Property({ type: JsonType })
  metadata: Record<string, unknown> = {};

  @Property({ type: Date, defaultRaw: 'now()' })
  occurredAt: Date = new Date();

  @Property({ length: 120, nullable: true })
  idempotencyKey?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();
}

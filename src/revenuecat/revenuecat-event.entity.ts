import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'revenuecat_events' })
export class RevenueCatEvent {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 255 })
  @Unique()
  eventId!: string;

  @Property({ length: 255, nullable: true })
  @Index()
  appUserId?: string | null;

  @Property({ length: 64 })
  eventType!: string;

  @Property({ type: Date, defaultRaw: 'now()' })
  processedAt: Date = new Date();

  @Property({ type: 'json' })
  rawPayload!: object;
}

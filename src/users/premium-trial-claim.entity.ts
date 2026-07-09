import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'premium_trial_claims' })
export class PremiumTrialClaim {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 64 })
  @Unique()
  emailHash!: string;

  @Property({ type: Date })
  trialStartedAt!: Date;

  @Property({ type: Date })
  trialEndsAt!: Date;

  @Property({ type: 'uuid', nullable: true })
  lastUserId?: string | null;

  @Property({ length: 255, nullable: true })
  lastClerkUserId?: string | null;

  @Property({ type: Date, defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: Date, defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
